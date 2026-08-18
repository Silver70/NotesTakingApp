import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { FolderRow } from "@/db/schema";
import { useThemeColor } from "@/hooks/use-theme-color";

type PickerItem = { folderId: number | null; label: string };

/**
 * Cross-platform picker for moving an existing Note to a different Folder
 * or back to Unfiled (ticket 05) — always offers "Unfiled" first, then
 * every Folder. A scrollable modal list rather than `Alert.alert`'s button
 * list: the number of Folders is unbounded and Alert's buttons don't
 * scroll.
 */
export function FolderPickerModal({
  visible,
  folders,
  currentFolderId,
  onCancel,
  onSelect,
}: {
  visible: boolean;
  folders: FolderRow[];
  currentFolderId: number | null;
  onCancel: () => void;
  onSelect: (folderId: number | null) => void;
}) {
  const separatorColor = useThemeColor({}, "separator");
  const tintColor = useThemeColor({}, "tint");

  const items: PickerItem[] = [
    { folderId: null, label: "Unfiled" },
    ...folders.map((folder) => ({ folderId: folder.id, label: folder.name })),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Swallows the tap so it doesn't bubble to the backdrop's
            dismiss handler above — the sheet itself shouldn't close the
            modal when tapped. */}
        <Pressable
          style={styles.sheetWrapper}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedView style={[styles.sheet, { borderColor: separatorColor }]}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              Move to Folder
            </ThemedText>
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.folderId)}
              ItemSeparatorComponent={() => (
                <View
                  style={[styles.separator, { backgroundColor: separatorColor }]}
                />
              )}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelect(item.folderId)}
                  style={styles.row}
                  accessibilityRole="button"
                >
                  <ThemedText style={styles.rowLabel}>{item.label}</ThemedText>
                  {item.folderId === currentFolderId && (
                    <IconSymbol name="checkmark" size={18} color={tintColor} />
                  )}
                </Pressable>
              )}
            />
            <Pressable onPress={onCancel} style={styles.cancel} hitSlop={8}>
              <ThemedText type="defaultSemiBold">Cancel</ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheetWrapper: {
    maxHeight: "70%",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    textAlign: "center",
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowLabel: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  cancel: {
    alignItems: "center",
    paddingVertical: 14,
  },
});
