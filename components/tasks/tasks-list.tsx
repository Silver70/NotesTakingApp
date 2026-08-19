import type { ComponentType, ReactElement } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { deriveTitle } from "@/db/repository";
import type { NoteRow } from "@/db/schema";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { TaskGroup, TaskItem } from "@/lib/notes/tasks";

/** A Note as the Tasks screen sees it: a row plus the Folder context
 * `withFolderContext` (ticket 06's seam) attaches — same "which Folder is
 * this in" line a search result carries, for the same reason: items here
 * come from every Folder at once. */
export type TaskNote = NoteRow & { folderName: string | null };

/** What an item with no text of its own reads as — a checklist item can
 * legitimately be empty in the editor, and an empty row would otherwise
 * render as an untappable blank line. */
const EMPTY_ITEM_LABEL = "Empty item";

function TaskRow({
  task,
  onToggle,
  onOpen,
}: {
  task: TaskItem;
  onToggle: (checked: boolean) => void;
  onOpen: () => void;
}) {
  const accent = useThemeColor({}, "tint");
  const icon = useThemeColor({}, "icon");
  const placeholder = useThemeColor({}, "placeholder");

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onToggle(!task.checked)}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.checked }}
        accessibilityLabel={task.text || EMPTY_ITEM_LABEL}
      >
        <IconSymbol
          name={task.checked ? "checkmark.circle.fill" : "circle"}
          size={22}
          color={task.checked ? accent : icon}
        />
      </Pressable>
      <Pressable style={styles.rowText} onPress={onOpen} accessibilityRole="button">
        <ThemedText
          numberOfLines={2}
          style={[
            styles.taskText,
            task.checked && styles.taskTextChecked,
            (task.checked || !task.text) && { color: placeholder },
          ]}
        >
          {task.text || EMPTY_ITEM_LABEL}
        </ThemedText>
      </Pressable>
    </View>
  );
}

/**
 * The Tasks rollup (ticket 10): every Note that holds a checklist, as a
 * card of its items. Grouping is what makes a flat cross-Note list
 * readable — an item's text alone ("call them back") rarely says which
 * Note it came from, so each card leads with that Note's derived title
 * and its Folder, and tapping either the title or an item opens it.
 *
 * Deliberately not a `NoteCard`: that card is a Note *summary* (title +
 * body snippet) and every list built on it opens a Note and nothing else.
 * A task row's checkbox is a second, in-place action on content inside
 * the Note, which is a different shape of row entirely.
 */
export function TasksList({
  groups,
  onOpenNote,
  onToggle,
  emptyMessage,
  ListHeaderComponent,
}: {
  groups: TaskGroup<TaskNote>[];
  onOpenNote: (note: TaskNote) => void;
  onToggle: (note: TaskNote, task: TaskItem, checked: boolean) => void;
  emptyMessage: string;
  ListHeaderComponent?: ComponentType<unknown> | ReactElement | null;
}) {
  const placeholder = useThemeColor({}, "placeholder");

  return (
    <FlatList
      data={groups}
      keyExtractor={(group) => String(group.note.id)}
      ListHeaderComponent={ListHeaderComponent}
      // Matches NotesList's fixed bottom padding — every caller renders
      // the floating BottomNav over this list.
      contentContainerStyle={[
        styles.content,
        groups.length === 0 && styles.emptyContent,
      ]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => {
        const openCount = item.tasks.filter((task) => !task.checked).length;
        return (
          <Card style={styles.card}>
            <Pressable onPress={() => onOpenNote(item.note)} accessibilityRole="button">
              <ThemedText
                style={[styles.eyebrow, { color: placeholder }]}
                numberOfLines={1}
              >
                {item.note.folderName ?? "Unfiled"}
              </ThemedText>
              <View style={styles.cardHeader}>
                <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
                  {deriveTitle(item.note.content)}
                </ThemedText>
                <ThemedText style={[styles.count, { color: placeholder }]}>
                  {openCount === 0 ? "Done" : `${openCount} left`}
                </ThemedText>
              </View>
            </Pressable>
            <View style={styles.rows}>
              {item.tasks.map((task) => (
                <TaskRow
                  key={task.index}
                  task={task}
                  onToggle={(checked) => onToggle(item.note, task, checked)}
                  onOpen={() => onOpenNote(item.note)}
                />
              ))}
            </View>
          </Card>
        );
      }}
      ListEmptyComponent={<ThemedText style={styles.empty}>{emptyMessage}</ThemedText>}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 17,
  },
  count: {
    fontSize: 12,
    fontWeight: "600",
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rowText: {
    flex: 1,
  },
  taskText: {
    fontSize: 15,
    lineHeight: 21,
  },
  taskTextChecked: {
    textDecorationLine: "line-through",
  },
  separator: {
    height: 12,
  },
  empty: {
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
