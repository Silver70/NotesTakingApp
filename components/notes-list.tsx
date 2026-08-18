import { FlatList, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { deriveTitle } from "@/db/repository";
import type { NoteRow } from "@/db/schema";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * The Note list row/empty-state UI shared by "All Notes" (ticket 03) and a
 * single Folder's browse view (ticket 05) — both show the same
 * derived-title rows with the same inline delete affordance, differing
 * only in which Notes they pass in and what happens when the list is
 * empty.
 */
export function NotesList({
  notes,
  onPress,
  onDelete,
  emptyMessage,
}: {
  notes: NoteRow[];
  onPress: (note: NoteRow) => void;
  onDelete: (note: NoteRow) => void;
  emptyMessage: string;
}) {
  const iconColor = useThemeColor({}, "icon");
  const separatorColor = useThemeColor({}, "separator");

  return (
    <FlatList
      data={notes}
      keyExtractor={(note) => String(note.id)}
      contentContainerStyle={
        notes.length === 0 ? styles.emptyContainer : undefined
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
          <Pressable
            onPress={() => onDelete(item)}
            hitSlop={8}
            accessibilityRole="button"
          >
            <IconSymbol name="trash.fill" size={20} color={iconColor} />
          </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  title: {
    flex: 1,
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
