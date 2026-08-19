import { useRouter } from "expo-router";
import { useDeferredValue, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SearchResultsList } from "@/components/search-results-list";
import { ThemedView } from "@/components/themed-view";
import { BackButton } from "@/components/ui/back-button";
import { AddNoteButton } from "@/components/ui/add-note-button";
import { toZoomParams } from "@/lib/zoom-origin";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { NoteRow } from "@/db/schema";
import { useSearchResults } from "@/hooks/use-notes-store";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * Global search (ticket 06): live, filter-as-you-type across every Note's
 * derived title and body content, regardless of Folder — never scoped to
 * whichever Folder the user searched from (see CONTEXT.md, "Search").
 *
 * Results are *derived* from the Notes already in the store, not fetched.
 * `searchNotes` always read every Note and filtered it in memory —
 * `content` is opaque to SQL (ADR-0001), so there was never an index to
 * use — which means running the same predicate over the store returns
 * identical results with no round trip. That removed this screen's
 * debounce, its folder cache, and its stale-response guard in one go:
 * there is no longer an async result that can arrive out of order.
 *
 * `useDeferredValue` replaces the debounce it no longer needs. Filtering
 * parses every Note's document, so on a large library it's real work per
 * keystroke; deferring lets React keep the text field responsive and
 * render results a beat behind, rather than pausing typing on a fixed
 * timer whether or not the work was slow.
 */
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const textColor = useThemeColor({}, "text");
  const placeholderColor = useThemeColor({}, "placeholder");
  const separatorColor = useThemeColor({}, "separator");
  const surfaceColor = useThemeColor({}, "surface");

  const [query, setQuery] = useState("");
  const results = useSearchResults(useDeferredValue(query));

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
      <AddNoteButton
        onPress={(origin) =>
          router.push({
            pathname: "/note/[id]",
            params: { id: "new", ...toZoomParams(origin) },
          })
        }
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
