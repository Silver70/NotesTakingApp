import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingView } from "@/components/loading-view";
import { NotesList } from "@/components/notes-list";
import { TextPromptModal } from "@/components/text-prompt-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BackButton } from "@/components/ui/back-button";
import { BottomNav, NAV_ROUTES } from "@/components/ui/bottom-nav";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useNotesRepository } from "@/db/context";
import type { FolderRow, NoteRow } from "@/db/schema";
import { useFolderActions } from "@/hooks/use-folder-actions";
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
  const repo = useNotesRepository();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, "surface");
  const textColor = useThemeColor({}, "text");

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

  // Same reasoning as app/index.tsx: catches a Note created, edited, or
  // discarded in the editor and returned from.
  useFocusEffect(reload);

  const { renamingFolder, setRenamingFolder, handleRename, showOptions } = useFolderActions(
    repo,
    {
      onChanged: reload,
      // Deleting the Folder being browsed leaves nothing here to show —
      // back out to wherever this screen was reached from (its own entry
      // in Home's Folders row is gone too, since that reloads on focus).
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
        emptyMessage="No Notes here yet — tap the + button to create one."
      />
      <BottomNav
        active="home"
        onNavigate={(section) => router.push(NAV_ROUTES[section])}
        onAdd={handleNewNote}
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
