import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { LoadingView } from "@/components/loading-view";
import { NotesList } from "@/components/notes-list";
import { TextPromptModal } from "@/components/text-prompt-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useNotesRepository } from "@/db/context";
import type { FolderRow, NoteRow } from "@/db/schema";
import { useFolderActions } from "@/hooks/use-folder-actions";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * Browsing into a single Folder (ticket 05): only the Notes assigned to
 * it, and "+ New Note" here defaults the new Note into this Folder rather
 * than leaving it Unfiled (see CONTEXT.md's "Resolved behaviors"). Rename
 * and delete are also surfaced here, not just from the Folders list on
 * app/index.tsx, so a Folder never has to be renamed/deleted "from the
 * outside" while browsing it.
 */
export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const folderId = Number(id);
  const repo = useNotesRepository();
  const router = useRouter();
  const iconColor = useThemeColor({}, "icon");

  const [folder, setFolder] = useState<FolderRow | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [notFound, setNotFound] = useState(false);

  // Guards against an older `reload()` call's response resolving after a
  // newer one's — same reasoning as `changeSeqRef` in app/note/[id].tsx —
  // so a stale "not found" (or stale folder/notes) can never clobber a
  // fresher, successful load.
  const requestIdRef = useRef(0);

  const reload = useCallback(() => {
    const requestId = ++requestIdRef.current;
    if (!Number.isFinite(folderId)) {
      setNotFound(true);
      return;
    }
    // Cleared at the start of every fresh attempt, not just set on
    // failure — otherwise a transient miss (or a stale response arriving
    // after a retry was already in flight) would leave this screen stuck
    // on "This Folder no longer exists." even once a later load succeeds.
    setNotFound(false);
    repo
      .getFolder(folderId)
      .then((row) => {
        if (requestId !== requestIdRef.current) return;
        if (!row) {
          setNotFound(true);
          return;
        }
        setFolder(row);
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to load folder", error);
      });
    repo
      .listNotes({ type: "folder", folderId })
      .then((rows) => {
        if (requestId !== requestIdRef.current) return;
        setNotes(rows);
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to load folder notes", error);
      });
  }, [repo, folderId]);

  // Same reasoning as app/notes.tsx: catches a Note created, edited, or
  // discarded in the editor and returned from.
  useFocusEffect(reload);

  const { renamingFolder, setRenamingFolder, handleRename, showOptions } = useFolderActions(
    repo,
    {
      onChanged: reload,
      // Deleting the Folder being browsed leaves nothing here to show —
      // back out to wherever this screen was reached from (its own entry
      // in the Folders list is gone too, since that list reloads on
      // focus).
      onDeleted: () => router.back(),
    },
  );

  const handleNewNote = useCallback(() => {
    router.push({
      pathname: "/note/[id]",
      params: { id: "new", folderId: String(folderId) },
    });
  }, [router, folderId]);

  const handleDelete = useCallback(
    (note: NoteRow) => {
      Alert.alert("Delete Note?", "This can't be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await repo.deleteNote(note.id);
              reload();
            } catch (error) {
              console.error("Failed to delete note", error);
              Alert.alert("Couldn't delete this Note", "Please try again.");
            }
          },
        },
      ]);
    },
    [repo, reload],
  );

  const handleOptions = useCallback(() => {
    if (folder) showOptions(folder);
  }, [folder, showOptions]);

  if (notFound) {
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
      <Stack.Screen
        options={{
          title: folder.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={handleNewNote} hitSlop={8}>
                <ThemedText type="defaultSemiBold">+ New Note</ThemedText>
              </Pressable>
              <Pressable onPress={handleOptions} hitSlop={8}>
                <IconSymbol name="ellipsis" size={20} color={iconColor} />
              </Pressable>
            </View>
          ),
        }}
      />
      <NotesList
        notes={notes}
        onPress={(note) => router.push(`/note/${note.id}`)}
        onDelete={handleDelete}
        emptyMessage="No Notes here yet — tap “+ New Note” to create one."
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
});
