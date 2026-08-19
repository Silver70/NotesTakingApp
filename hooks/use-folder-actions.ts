import { useCallback, useState } from "react";
import { Alert } from "react-native";

import type { FolderRow } from "@/db/schema";
import { useNotesActions } from "@/hooks/use-notes-store";

/**
 * Rename/delete behavior for a Folder (ticket 05), shared by the Folders
 * list (app/index.tsx) and a single Folder's browse view
 * (app/folder/[id].tsx) — both offer the same two actions on a Folder and
 * would otherwise duplicate the same confirmation copy and error handling.
 *
 * Writes go through the Notes store rather than the repository, so both
 * screens see a rename or delete immediately without either one reloading:
 * the `onChanged` callback both callers used to pass for exactly that is
 * gone. `onDeleted` stays, because it isn't about refreshing data — it's
 * the one genuine difference between the two callers (stay put vs.
 * navigate back out of the Folder that no longer exists).
 */
export function useFolderActions({ onDeleted }: { onDeleted?: (folder: FolderRow) => void } = {}) {
  const { renameFolder, deleteFolder } = useNotesActions();
  const [renamingFolder, setRenamingFolder] = useState<FolderRow | null>(null);

  const handleRename = useCallback(
    async (name: string) => {
      if (!renamingFolder) return;
      try {
        await renameFolder(renamingFolder.id, name);
        setRenamingFolder(null);
      } catch (error) {
        console.error("Failed to rename folder", error);
        Alert.alert("Couldn't rename this Folder", "Please try again.");
      }
    },
    [renameFolder, renamingFolder],
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
              await deleteFolder(folder.id);
              onDeleted?.(folder);
            } catch (error) {
              console.error("Failed to delete folder", error);
              Alert.alert("Couldn't delete this Folder", "Please try again.");
            }
          },
        },
      ]);
    },
    [deleteFolder, onDeleted],
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
