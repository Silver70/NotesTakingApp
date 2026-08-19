import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { FolderRow } from "@/db/schema";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * The Home screen's horizontal strip of Folder chips (ticket-less UI
 * pass) — a quick-glance, scrollable alternative to a plain list row,
 * always ending in a "New Folder" chip so creating one never depends on
 * any Folder already existing. Renaming/deleting a Folder is reached by
 * long-pressing its chip (`onLongPress`) rather than a separate icon,
 * since a compact chip has no room for one.
 */
export function FoldersRow({
  folders,
  onPress,
  onLongPress,
  onAddPress,
}: {
  folders: FolderRow[];
  onPress: (folder: FolderRow) => void;
  onLongPress: (folder: FolderRow) => void;
  onAddPress: () => void;
}) {
  const surfaceAlt = useThemeColor({}, "surfaceAlt");
  const surface = useThemeColor({}, "surface");
  const tint = useThemeColor({}, "tint");
  const text = useThemeColor({}, "text");
  const separator = useThemeColor({}, "separator");

  return (
    <FlatList
      data={folders}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(folder) => String(folder.id)}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onPress(item)}
          onLongPress={() => onLongPress(item)}
          style={[styles.chip, { backgroundColor: surfaceAlt }]}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.name}`}
          accessibilityHint="Double tap and hold for rename or delete options"
        >
          <View style={[styles.iconBubble, { backgroundColor: surface }]}>
            <IconSymbol name="folder.fill" size={22} color={tint} />
          </View>
          <ThemedText numberOfLines={1} style={styles.chipLabel}>
            {item.name}
          </ThemedText>
        </Pressable>
      )}
      ListFooterComponent={
        <Pressable
          onPress={onAddPress}
          style={[styles.chip, styles.addChip, { borderColor: separator }]}
          accessibilityRole="button"
          accessibilityLabel="New Folder"
        >
          <View style={[styles.iconBubble, { backgroundColor: surface }]}>
            <IconSymbol name="plus" size={18} color={text} />
          </View>
          <ThemedText numberOfLines={1} style={styles.chipLabel}>
            New Folder
          </ThemedText>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingRight: 4,
  },
  chip: {
    width: 108,
    borderRadius: 20,
    padding: 12,
    gap: 8,
  },
  addChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
