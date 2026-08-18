import { FlatList, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { deriveTitle } from "@/db/repository";
import type { NoteRow } from "@/db/schema";
import { useThemeColor } from "@/hooks/use-theme-color";

export type SearchResultRow = NoteRow & { folderName: string | null };

/**
 * Global search's result rows (ticket 06). Distinct from `NotesList`
 * (ticket 03/05) rather than a variant of it: every result here can come
 * from a different Folder, so each row needs a second line naming that
 * Folder (or "Unfiled") for context — something no `NotesList` caller,
 * always scoped to one Folder or all of them, has ever needed to show. No
 * delete affordance either — search only opens a Note (see 06's spec).
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
  const separatorColor = useThemeColor({}, "separator");
  const placeholderColor = useThemeColor({}, "placeholder");

  return (
    <FlatList
      data={results}
      keyExtractor={(note) => String(note.id)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={
        results.length === 0 ? styles.emptyContainer : undefined
      }
      ItemSeparatorComponent={() => (
        <ThemedView
          style={[styles.separator, { backgroundColor: separatorColor }]}
        />
      )}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onPress(item)}
          style={styles.row}
          accessibilityRole="button"
        >
          <ThemedText style={styles.title} numberOfLines={1}>
            {deriveTitle(item.content)}
          </ThemedText>
          <ThemedText
            numberOfLines={1}
            style={[styles.folder, { color: placeholderColor }]}
          >
            {item.folderName ?? "Unfiled"}
          </ThemedText>
        </Pressable>
      )}
      ListEmptyComponent={
        <ThemedView style={styles.empty}>
          <ThemedText>{emptyMessage}</ThemedText>
        </ThemedView>
      }
    />
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 2,
  },
  title: {
    fontWeight: "600",
  },
  folder: {
    fontSize: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  emptyContainer: {
    flexGrow: 1,
  },
});
