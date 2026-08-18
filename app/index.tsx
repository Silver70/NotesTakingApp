import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";

import { TextPromptModal } from "@/components/text-prompt-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useNotesRepository } from "@/db/context";
import type { FolderRow } from "@/db/schema";
import { useFolderActions } from "@/hooks/use-folder-actions";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * The app's landing screen (ticket 05): "All Notes" pinned above every
 * Folder, Apple Notes-style. Folders are flat and shown with a single
 * fixed icon (see CONTEXT.md, "Folder") — there's nothing per-folder to
 * customize, just a name to create, rename, or delete.
 */
export default function FoldersScreen() {
  const repo = useNotesRepository();
  const router = useRouter();
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [creating, setCreating] = useState(false);
  const iconColor = useThemeColor({}, "icon");
  const separatorColor = useThemeColor({}, "separator");

  const reload = useCallback(() => {
    repo.listFolders().then(setFolders).catch((error) => {
      console.error("Failed to load folders", error);
    });
  }, [repo]);

  useFocusEffect(reload);

  const { renamingFolder, setRenamingFolder, handleRename, showOptions } = useFolderActions(
    repo,
    { onChanged: reload, onDeleted: reload },
  );

  const handleCreate = useCallback(
    async (name: string) => {
      try {
        await repo.createFolder(name);
        setCreating(false);
        reload();
      } catch (error) {
        console.error("Failed to create folder", error);
        Alert.alert("Couldn't create this Folder", "Please try again.");
      }
    },
    [repo, reload],
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Notes",
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push("/search")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Search Notes"
              >
                <IconSymbol name="magnifyingglass" size={20} color={iconColor} />
              </Pressable>
              <Pressable onPress={() => setCreating(true)} hitSlop={8}>
                <ThemedText type="defaultSemiBold">+ New Folder</ThemedText>
              </Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        data={folders}
        keyExtractor={(folder) => String(folder.id)}
        ListHeaderComponent={
          <>
            <Pressable
              onPress={() => router.push("/notes")}
              style={styles.row}
              accessibilityRole="button"
            >
              <ThemedText type="defaultSemiBold" style={styles.rowLabel}>
                All Notes
              </ThemedText>
              <IconSymbol name="chevron.right" size={18} color={iconColor} />
            </Pressable>
            <ThemedView
              style={[styles.separator, { backgroundColor: separatorColor }]}
            />
          </>
        }
        ItemSeparatorComponent={() => (
          <ThemedView
            style={[styles.separator, { backgroundColor: separatorColor }]}
          />
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/folder/${item.id}`)}
            style={styles.row}
            accessibilityRole="button"
          >
            <IconSymbol name="folder.fill" size={20} color={iconColor} />
            <ThemedText style={styles.rowLabel} numberOfLines={1}>
              {item.name}
            </ThemedText>
            <Pressable
              onPress={() => showOptions(item)}
              hitSlop={8}
              accessibilityRole="button"
            >
              <IconSymbol name="ellipsis" size={20} color={iconColor} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <ThemedView style={styles.empty}>
            <ThemedText>
              No Folders yet — tap “+ New Folder” to create one.
            </ThemedText>
          </ThemedView>
        }
      />
      <TextPromptModal
        visible={creating}
        title="New Folder"
        confirmLabel="Create"
        placeholder="Folder name"
        onCancel={() => setCreating(false)}
        onSubmit={handleCreate}
      />
      <TextPromptModal
        visible={renamingFolder !== null}
        title="Rename Folder"
        confirmLabel="Save"
        initialValue={renamingFolder?.name ?? ""}
        onCancel={() => setRenamingFolder(null)}
        onSubmit={handleRename}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
});
