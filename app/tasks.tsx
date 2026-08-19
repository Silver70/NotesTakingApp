import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TasksList, type TaskNote } from "@/components/tasks/tasks-list";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomNav, NAV_ROUTES } from "@/components/ui/bottom-nav";
import { useNotesRepository } from "@/db/context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { withFolderContext } from "@/lib/notes/search";
import {
  collectTasks,
  setTaskChecked,
  type TaskGroup,
  type TaskItem,
} from "@/lib/notes/tasks";

/**
 * The Tasks rollup (ticket 10): every checklist item from every Note in
 * one place, grouped by the Note it lives in. Checklists have existed
 * since ticket 04, but only ever inside the Note holding them — a to-do
 * written into "Trip planning" is invisible from anywhere else.
 *
 * Like Search (ticket 06), this screen owns no query of its own: it reads
 * the repository's existing `listNotes`/`listFolders` and reconciles them
 * through two pure seams — `withFolderContext` for each Note's Folder
 * name, `collectTasks` for the items themselves. A Note's `content` is
 * opaque to SQL (ADR-0001), so checklist items can only be found by
 * walking the document; there's no query to push this into.
 *
 * **A toggle here is a real edit to the Note.** It goes through
 * `updateNoteContent`, so it bumps `updatedAt` and moves that Note up
 * Home's most-recently-edited order — accepted rather than worked around:
 * ticking a checkbox changes the Note's stored content, and a second
 * "update that doesn't count as an update" path would put the repository
 * at odds with the Note's own model for a purely cosmetic reason.
 */
export default function TasksScreen() {
  const repo = useNotesRepository();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const subtitleColor = useThemeColor({}, "placeholder");

  const [groups, setGroups] = useState<TaskGroup<TaskNote>[]>([]);

  // Guards a stale response from clobbering a fresher one — same
  // requestIdRef pattern as app/folder/[id].tsx and app/search.tsx.
  const requestIdRef = useRef(0);

  const reload = useCallback(() => {
    const requestId = ++requestIdRef.current;
    Promise.all([repo.listNotes(), repo.listFolders()])
      .then(([notes, folders]) => {
        if (requestId !== requestIdRef.current) return;
        setGroups(collectTasks(withFolderContext(notes, folders)));
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to load tasks", error);
      });
  }, [repo]);

  // Same `useFocusEffect` reload every other list screen does — an item
  // ticked, added, or deleted inside the editor has to be reflected on
  // the way back, and this screen has no other way to hear about it.
  useFocusEffect(reload);

  const handleToggle = useCallback(
    async (note: TaskNote, task: TaskItem, checked: boolean) => {
      // Applied to local state first so the checkbox responds on the tap
      // rather than after a database round trip. Deliberately does *not*
      // re-sort the group: `collectTasks` floats open items above
      // completed ones, so re-sorting here would yank the row out from
      // under the finger that just tapped it. The list re-sorts on the
      // next focus instead.
      setGroups((previous) =>
        previous.map((group) =>
          group.note.id === note.id
            ? {
                ...group,
                tasks: group.tasks.map((candidate) =>
                  candidate.index === task.index ? { ...candidate, checked } : candidate,
                ),
              }
            : group,
        ),
      );

      try {
        // Re-read rather than trusting the copy this list is rendering: a
        // task's ordinal is only meaningful against the document it came
        // from, and that document may have been edited in the editor
        // since this screen last loaded it.
        const current = await repo.getNote(note.id);
        if (!current) {
          reload();
          return;
        }
        const updated = setTaskChecked(current.content, task.index, checked);
        if (updated === current.content) {
          // The ordinal no longer addresses an item (the checklist
          // changed underneath us) — or, harmlessly, the stored state
          // already matched. Either way the safe move is to resync rather
          // than write a guess back over the Note.
          reload();
          return;
        }
        await repo.updateNoteContent(note.id, updated);
      } catch (error) {
        console.error("Failed to update this checklist item", error);
        Alert.alert("Couldn't update this item", "Please try again.");
        reload();
      }
    },
    [repo, reload],
  );

  const openCount = groups.reduce(
    (total, group) => total + group.tasks.filter((task) => !task.checked).length,
    0,
  );

  return (
    <ThemedView style={styles.container}>
      <TasksList
        groups={groups}
        onOpenNote={(note) => router.push(`/note/${note.id}`)}
        onToggle={handleToggle}
        emptyMessage="No checklist items yet — add a checklist to a Note and its items show up here."
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="largeTitle" style={{ paddingTop: insets.top + 8 }}>
              Tasks
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: subtitleColor }]}>
              {groups.length === 0
                ? "Every checklist item across your Notes."
                : `${openCount} open across ${groups.length} ${
                    groups.length === 1 ? "Note" : "Notes"
                  }.`}
            </ThemedText>
          </View>
        }
      />
      <BottomNav
        active="tasks"
        onNavigate={(section) => router.push(NAV_ROUTES[section])}
        onAdd={() => router.push("/note/new")}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    gap: 8,
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 14,
  },
});
