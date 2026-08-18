import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useNotesRepository } from "@/db/context";
import { deriveTitle } from "@/db/repository";
import type { NoteRow } from "@/db/schema";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function AllNotesScreen() {
  const repo = useNotesRepository();
  const router = useRouter();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const iconColor = useThemeColor({}, "icon");
  const separatorColor = useThemeColor({}, "separator");

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
          headerRight: () => (
            <Pressable onPress={handleNewNote} hitSlop={8}>
              <ThemedText type="defaultSemiBold">+ New Note</ThemedText>
            </Pressable>
          ),
        }}
      />
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
            onPress={() => router.push(`/note/${item.id}`)}
            style={styles.row}
            accessibilityRole="button"
          >
            <ThemedText style={styles.title} numberOfLines={1}>
              {deriveTitle(item.content)}
            </ThemedText>
            <Pressable
              onPress={() => handleDelete(item)}
              hitSlop={8}
              accessibilityRole="button"
            >
              <IconSymbol name="trash.fill" size={20} color={iconColor} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <ThemedView style={styles.empty}>
            <ThemedText>
              No Notes yet — tap “+ New Note” to create one.
            </ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
