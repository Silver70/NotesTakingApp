import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";

import { NotesList } from "@/components/notes-list";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useNotesRepository } from "@/db/context";
import type { NoteRow } from "@/db/schema";

/**
 * "All Notes" (ticket 05 renamed this from the app's root — see
 * app/index.tsx — to the Folders/home screen): every Note regardless of
 * Folder assignment, most-recently-edited first. "+ New Note" here always
 * creates an Unfiled Note (see CONTEXT.md's "Resolved behaviors") — the
 * Folder-scoped equivalent lives in app/folder/[id].tsx.
 */
export default function AllNotesScreen() {
  const repo = useNotesRepository();
  const router = useRouter();
  const [notes, setNotes] = useState<NoteRow[]>([]);

  const reload = useCallback(() => {
    repo.listNotes().then(setNotes).catch((error) => {
      console.error("Failed to load notes", error);
    });
  }, [repo]);

  // Re-fetch every time this screen regains focus — covers returning from
  // the editor after an autosaved edit, a new Note, or a discarded blank
  // Note, none of which this screen otherwise knows happened.
  useFocusEffect(reload);

  const handleNewNote = useCallback(() => {
    router.push("/note/new");
  }, [router]);

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

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: "All Notes",
          headerRight: () => (
            <Pressable onPress={handleNewNote} hitSlop={8}>
              <ThemedText type="defaultSemiBold">+ New Note</ThemedText>
            </Pressable>
          ),
        }}
      />
      <NotesList
        notes={notes}
        onPress={(note) => router.push(`/note/${note.id}`)}
        onDelete={handleDelete}
        emptyMessage="No Notes yet — tap “+ New Note” to create one."
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
