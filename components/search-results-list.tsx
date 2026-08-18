import { FlatList, StyleSheet, View } from "react-native";

import { NoteCard } from "@/components/notes/note-card";
import { ThemedText } from "@/components/themed-text";
import type { NoteRow } from "@/db/schema";

export type SearchResultRow = NoteRow & { folderName: string | null };

/**
 * Global search's result rows (ticket 06). Shares `NoteCard` with
 * `NotesList` but passes `subtitle` (the result's Folder name, or
 * "Unfiled") instead of letting the card fall back to its date — every
 * result here can come from a different Folder, so that's the context a
 * search result needs that a Folder-scoped list never does. No `onDelete`
 * either — search only opens a Note (see CONTEXT.md, "Search").
 */
export function SearchResultsList({
  results,
  onPress,
  emptyMessage,
}: {
  results: SearchResultRow[];
  onPress: (note: NoteRow) => void;
  emptyMessage: string;
}) {
  return (
    <FlatList
      data={results}
      keyExtractor={(note) => String(note.id)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        results.length === 0 && styles.emptyContent,
      ]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <NoteCard
          note={item}
          subtitle={item.folderName ?? "Unfiled"}
          onPress={() => onPress(item)}
        />
      )}
      ListEmptyComponent={
        <ThemedText style={styles.empty}>{emptyMessage}</ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  separator: {
    height: 12,
  },
  empty: {
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
