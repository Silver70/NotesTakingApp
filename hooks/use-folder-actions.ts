import { useCallback, useState } from "react";
import { Alert } from "react-native";

import type { NotesRepository } from "@/db/repository";
import type { FolderRow } from "@/db/schema";

/**
 * Rename/delete behavior for a Folder (ticket 05), shared by the Folders
 * list (app/index.tsx) and a single Folder's browse view
 * (app/folder/[id].tsx) — both offer the same two actions on a Folder and
 * would otherwise duplicate the same confirmation copy and error handling.
 * `onDeleted` is the one thing that genuinely differs between the two
 * callers (reload the list vs. navigate back out of the now-gone Folder),
 * so it's left to them.
 */
export function useFolderActions(
  repo: NotesRepository,
  { onChanged, onDeleted }: { onChanged: () => void; onDeleted: (folder: FolderRow) => void },
) {
  const [renamingFolder, setRenamingFolder] = useState<FolderRow | null>(null);

  const handleRename = useCallback(
    async (name: string) => {
      if (!renamingFolder) return;
      try {
        await repo.renameFolder(renamingFolder.id, name);
        setRenamingFolder(null);
        onChanged();
      } catch (error) {
        console.error("Failed to rename folder", error);
        Alert.alert("Couldn't rename this Folder", "Please try again.");
      }
    },
    [repo, renamingFolder, onChanged],
  );

  const confirmDelete = useCallback(
    (folder: FolderRow) => {
      // Deleting a Folder never deletes its Notes — they move to Unfiled
      // (already true at the repository layer, ticket 02). This just
      // surfaces that through a destructive confirmation, same pattern as
      // deleting a Note.
      Alert.alert(`Delete "${folder.name}"?`, "Its Notes will move to Unfiled.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await repo.deleteFolder(folder.id);
              onDeleted(folder);
            } catch (error) {
              console.error("Failed to delete folder", error);
              Alert.alert("Couldn't delete this Folder", "Please try again.");
            }
          },
        },
      ]);
    },
    [repo, onDeleted],
  );

  const showOptions = useCallback(
    (folder: FolderRow) => {
      Alert.alert(folder.name, undefined, [
        { text: "Rename", onPress: () => setRenamingFolder(folder) },
        { text: "Delete", style: "destructive", onPress: () => confirmDelete(folder) },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [confirmDelete],
  );

  return { renamingFolder, setRenamingFolder, handleRename, showOptions };
}
