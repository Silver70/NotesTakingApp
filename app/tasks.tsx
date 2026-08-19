import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TasksList, type TaskNote } from "@/components/tasks/tasks-list";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomNav, NAV_ROUTES } from "@/components/ui/bottom-nav";
import { useNotesActions, useNotesState } from "@/hooks/use-notes-store";
import { useStableTaskGroups } from "@/hooks/use-stable-task-groups";
import { useThemeColor } from "@/hooks/use-theme-color";
import { selectNote } from "@/lib/notes/store";
import { setTaskChecked, type TaskItem } from "@/lib/notes/tasks";

/**
 * The Tasks rollup (ticket 10): every checklist item from every Note in
 * one place, grouped by the Note it lives in. Checklists have existed
 * since ticket 04, but only ever inside the Note holding them — a to-do
 * written into "Trip planning" is invisible from anywhere else.
 *
 * Like Search (ticket 06), this screen owns no query of its own, and no
 * copy of the data either. `useTaskGroups` derives the whole rollup from the
 * Notes already in the store through two pure seams: `withFolderContext`
 * for each Note's Folder name, `collectTasks` for the items themselves. A
 * Note's `content` is opaque to SQL (ADR-0001), so checklist items can
 * only be found by walking the document; there's no query to push this
 * into, and now no fetch to keep in order.
 *
 * **A toggle here is a real edit to the Note.** It goes through the
 * store's `updateNoteContent`, so it bumps `updatedAt` and moves that
 * Note up Home's most-recently-edited order — accepted rather than worked
 * around: ticking a checkbox changes the Note's stored content, and a
 * second "update that doesn't count as an update" path would put the
 * repository at odds with the Note's own model for a purely cosmetic
 * reason.
 */
export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const subtitleColor = useThemeColor({}, "placeholder");

  const state = useNotesState();
  const { updateNoteContent, refresh } = useNotesActions();
  // Live data, frozen order — see the hook for why ticking an item must
  // not rearrange the list under the finger that tapped it.
  const groups = useStableTaskGroups();

  const handleToggle = useCallback(
    async (note: TaskNote, task: TaskItem, checked: boolean) => {
      // Read the Note out of the store rather than trusting the copy this
      // list is rendering: a task's ordinal is only meaningful against the
      // document it came from. The store is that document's current
      // value — every write in the app goes through it — so this no
      // longer needs a database round trip to be sure it's current.
      const current = selectNote(state, note.id);
      if (!current) {
        void refresh();
        return;
      }
      const updated = setTaskChecked(current.content, task.index, checked);
      if (updated === current.content) {
        // The ordinal no longer addresses an item (the checklist changed
        // underneath us) — or, harmlessly, the stored state already
        // matched. Either way the safe move is to resync rather than
        // write a guess back over the Note.
        void refresh();
        return;
      }

      try {
        await updateNoteContent(note.id, updated);
      } catch (error) {
        console.error("Failed to update this checklist item", error);
        Alert.alert("Couldn't update this item", "Please try again.");
      }
    },
    [state, updateNoteContent, refresh],
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
