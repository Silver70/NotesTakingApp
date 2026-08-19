import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  SearchResultsList,
  type SearchResultRow,
} from "@/components/search-results-list";
import { ThemedView } from "@/components/themed-view";
import { BackButton } from "@/components/ui/back-button";
import { BottomNav, NAV_ROUTES } from "@/components/ui/bottom-nav";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useNotesRepository } from "@/db/context";
import type { FolderRow, NoteRow } from "@/db/schema";
import { withFolderContext } from "@/lib/notes/search";
import { useThemeColor } from "@/hooks/use-theme-color";

// Live search re-queries on every keystroke rather than waiting for a
// "search" action to press (per the spec) — debounced, same idea as the
// editor's autosave (`AUTOSAVE_DELAY_MS` in app/note/[id].tsx), so a fast
// typist doesn't fire a full-table scan per character.
const SEARCH_DEBOUNCE_MS = 200;

/**
 * Global search (ticket 06): live, filter-as-you-type across every Note's
 * derived title and body content, regardless of Folder — never scoped to
 * whichever Folder the user searched from (see CONTEXT.md, "Search"). The
 * repository's `searchNotes` already spans every Folder plus Unfiled, so
 * this screen's own job is presentation: re-querying as the user types
 * (debounced) and attaching each result's Folder name via
 * `withFolderContext` for the "which Folder is this in" context the spec
 * calls for.
 */
export default function SearchScreen() {
  const repo = useNotesRepository();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, "text");
  const placeholderColor = useThemeColor({}, "placeholder");
  const separatorColor = useThemeColor({}, "separator");
  const surfaceColor = useThemeColor({}, "surface");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultRow[]>([]);

  // Lets the focus-triggered re-run below always read the current query
  // without needing `query` in its own dependency array — putting it
  // there would recreate that effect's callback (and so re-subscribe its
  // focus listener) on every keystroke, re-fetching Folders on every
  // keystroke right along with it. A ref sidesteps that: `useFocusEffect`
  // only fires on an actual focus event, not on every render that updates
  // this ref.
  const queryRef = useRef(query);
  queryRef.current = query;

  // Folders rarely change mid-search, so they're kept out of the
  // per-keystroke path entirely — refreshed once per focus (below)
  // instead of refetched alongside every search.
  const foldersRef = useRef<FolderRow[]>([]);

  // Guards a stale response (from an older query, or from a focus-return
  // re-run overtaken by a newer keystroke) from clobbering a fresher one —
  // same requestIdRef pattern as app/folder/[id].tsx's reload.
  const requestIdRef = useRef(0);

  const runSearch = useCallback(
    (rawQuery: string) => {
      const requestId = ++requestIdRef.current;
      if (!rawQuery.trim()) {
        setResults([]);
        return;
      }
      repo
        .searchNotes(rawQuery)
        .then((notes) => {
          if (requestId !== requestIdRef.current) return;
          setResults(withFolderContext(notes, foldersRef.current));
        })
        .catch((error) => {
          if (requestId !== requestIdRef.current) return;
          console.error("Search failed", error);
          // Leaving the previous query's results on screen would read as
          // if they matched the current query — clearer to show "no
          // results" than silently-wrong ones.
          setResults([]);
        });
    },
    [repo],
  );

  // Re-fetches Folder names and re-runs the current query every time this
  // screen regains focus — the same "catches a Note created, edited, or
  // discarded... and returned from" reasoning app/index.tsx and
  // app/folder/[id].tsx already rely on `useFocusEffect` for. Without
  // this, a Note edited or deleted from a tapped-into result would still
  // show its old title (or still show at all) until the next keystroke.
  useFocusEffect(
    useCallback(() => {
      repo
        .listFolders()
        .then((rows) => {
          foldersRef.current = rows;
          runSearch(queryRef.current);
        })
        .catch((error) => {
          console.error("Failed to load folders", error);
          runSearch(queryRef.current);
        });
    }, [repo, runSearch]),
  );

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const handlePress = (note: NoteRow) => {
    router.push(`/note/${note.id}`);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => router.back()} />
        <View
          style={[
            styles.inputWrap,
            { backgroundColor: surfaceColor, borderColor: separatorColor },
          ]}
        >
          <IconSymbol name="magnifyingglass" size={18} color={placeholderColor} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search Notes"
            placeholderTextColor={placeholderColor}
            style={[styles.input, { color: textColor }]}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search Notes"
          />
        </View>
      </View>
      <SearchResultsList
        results={results}
        onPress={handlePress}
        emptyMessage={
          query.trim()
            ? `No results for "${query.trim()}".`
            : "Type to search every Note's title and content."
        }
      />
      <BottomNav
        active="home"
        onNavigate={(section) => router.push(NAV_ROUTES[section])}
        onAdd={() => router.push("/note/new")}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
});
