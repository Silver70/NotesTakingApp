import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FoldersRow } from "@/components/folders/folders-row";
import { NotesList } from "@/components/notes-list";
import { TextPromptModal } from "@/components/text-prompt-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomNav, NAV_ROUTES } from "@/components/ui/bottom-nav";
import { SearchBarButton } from "@/components/ui/search-bar-button";
import type { NoteRow } from "@/db/schema";
import { useFolderActions } from "@/hooks/use-folder-actions";
import { useFolders, useNotes, useNotesActions } from "@/hooks/use-notes-store";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * The app's landing screen (ticket-less UI pass, replacing the split
 * Folders-list/"All Notes" screens from ticket 05): a search entry point,
 * a horizontal strip of every Folder, and every Note — regardless of
 * Folder — as cards below, most-recently-edited first. Folders are flat
 * and shown with a single fixed icon (see CONTEXT.md, "Folder") — there's
 * nothing per-folder to customize, just a name to create, rename, or
 * delete (via FoldersRow's long-press).
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sectionLabelColor = useThemeColor({}, "placeholder");

  // Read straight off the shared store (components/notes-store-provider.tsx)
  // — no local copy and no `useFocusEffect` reload. A Note created, edited,
  // or discarded in the editor updated this list as it happened, so there
  // is nothing left to re-fetch on the way back.
  const notes = useNotes();
  const folders = useFolders();
  const { createFolder, deleteNote } = useNotesActions();

  const [creatingFolder, setCreatingFolder] = useState(false);

  const { renamingFolder, setRenamingFolder, handleRename, showOptions } = useFolderActions();

  const handleCreateFolder = useCallback(
    async (name: string) => {
      try {
        await createFolder(name);
        setCreatingFolder(false);
      } catch (error) {
        console.error("Failed to create folder", error);
        Alert.alert("Couldn't create this Folder", "Please try again.");
      }
    },
    [createFolder],
  );

  const handleDeleteNote = useCallback(
    (note: NoteRow) => {
      Alert.alert("Delete Note?", "This can't be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNote(note.id);
            } catch (error) {
              console.error("Failed to delete note", error);
              Alert.alert("Couldn't delete this Note", "Please try again.");
            }
          },
        },
      ]);
    },
    [deleteNote],
  );

  return (
    <ThemedView style={styles.container}>
      <NotesList
        notes={notes}
        onPress={(note) => router.push(`/note/${note.id}`)}
        onDelete={handleDeleteNote}
        emptyMessage="No Notes yet — tap the + button to create one."
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText
              type="largeTitle"
              style={{ paddingTop: insets.top + 8 }}
            >
              Your Notes
            </ThemedText>
            <SearchBarButton onPress={() => router.push("/search")} />
            <View style={styles.foldersSection}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.sectionLabel, { color: sectionLabelColor }]}
              >
                Folders
              </ThemedText>
              <FoldersRow
                folders={folders}
                onPress={(folder) => router.push(`/folder/${folder.id}`)}
                onLongPress={showOptions}
                onAddPress={() => setCreatingFolder(true)}
              />
            </View>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.sectionLabel, { color: sectionLabelColor }]}
            >
              Notes
            </ThemedText>
          </View>
        }
      />
      <BottomNav
        active="home"
        onNavigate={(section) => router.push(NAV_ROUTES[section])}
        onAdd={() => router.push("/note/new")}
      />
      <TextPromptModal
        visible={creatingFolder}
        title="New Folder"
        confirmLabel="Create"
        placeholder="Folder name"
        onCancel={() => setCreatingFolder(false)}
        onSubmit={handleCreateFolder}
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
  header: {
    gap: 20,
    paddingBottom: 8,
  },
  foldersSection: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
