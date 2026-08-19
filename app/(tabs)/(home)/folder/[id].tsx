import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingView } from "@/components/loading-view";
import { NotesList } from "@/components/notes-list";
import { TextPromptModal } from "@/components/text-prompt-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BackButton } from "@/components/ui/back-button";
import { AddNoteButton } from "@/components/ui/add-note-button";
import { toZoomParams } from "@/lib/zoom-origin";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { ZoomOrigin } from "@/components/ui/zoom-open-overlay";
import type { NoteRow } from "@/db/schema";
import { useFolderActions } from "@/hooks/use-folder-actions";
import { useFolderView, useNotesActions } from "@/hooks/use-notes-store";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * Browsing into a single Folder (ticket 05): only the Notes assigned to
 * it, and the floating "+" (ticket-less UI pass) here defaults the new
 * Note into this Folder rather than leaving it Unfiled (see CONTEXT.md's
 * "Resolved behaviors"). Rename and delete are also surfaced here, not
 * just from Home's Folders row, so a Folder never has to be
 * renamed/deleted "from the outside" while browsing it.
 */
export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const folderId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, "surface");
  const textColor = useThemeColor({}, "text");

  // This Folder and its Notes, selected out of the shared store rather
  // than fetched per focus. `missing` is the store's own "loaded, and this
  // Folder isn't there" answer — the distinction the old two-request
  // reload needed a stale-response guard to get right, now decided from a
  // single consistent snapshot.
  const { folder, notes, missing } = useFolderView(folderId);
  const { deleteNote } = useNotesActions();

  const { renamingFolder, setRenamingFolder, handleRename, showOptions } = useFolderActions({
    // Deleting the Folder being browsed leaves nothing here to show —
    // back out to wherever this screen was reached from (its own entry in
    // Home's Folders row is already gone, from the same store update).
    onDeleted: () => router.back(),
  });

  const handleNewNote = useCallback(
    (origin: ZoomOrigin) => {
      router.push({
        pathname: "/note/[id]",
        params: {
          id: "new",
          folderId: String(folderId),
          ...toZoomParams(origin),
        },
      });
    },
    [router, folderId],
  );

  const handleDelete = useCallback(
    (note: NoteRow) => {
      Alert.alert("Delete Note?", "This can't be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // A warning tick at the moment data is actually lost:
              // deletion here is immediate and irreversible (ADR-0003).
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
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

  const handleOptions = useCallback(() => {
    if (folder) showOptions(folder);
  }, [folder, showOptions]);

  if (missing) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>This Folder no longer exists.</ThemedText>
      </ThemedView>
    );
  }

  if (!folder) {
    return <LoadingView />;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => router.back()} />
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
          {folder.name}
        </ThemedText>
        <Pressable
          onPress={handleOptions}
          style={[styles.iconButton, { backgroundColor: surface }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Folder options"
        >
          <IconSymbol name="ellipsis" size={18} color={textColor} />
        </Pressable>
      </View>
      <NotesList
        notes={notes}
        onPress={(note) => router.push(`/note/${note.id}`)}
        onDelete={handleDelete}
        emptyTitle="This Folder's empty"
        emptyMessage={`Nothing filed under ${folder.name} yet — tap + to write something here.`}
      />
      <AddNoteButton onPress={handleNewNote} />
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
