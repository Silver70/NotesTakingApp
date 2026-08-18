import type { ComponentType, ReactElement } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { NoteCard } from "@/components/notes/note-card";
import { ThemedText } from "@/components/themed-text";
import type { NoteRow } from "@/db/schema";

/**
 * The Note list UI shared by Home (ticket 03/05's "All Notes", now folded
 * into app/index.tsx) and a single Folder's browse view (ticket 05) —
 * both show the same NoteCard rows with the same inline delete
 * affordance, differing only in which Notes they pass in, what happens
 * when the list is empty, and (Home only) a scrollable header above the
 * cards for its hero/search/Folders content.
 *
 * `contentContainerStyle`'s bottom padding is fixed rather than threaded
 * through as a prop: every current caller also renders the floating
 * BottomNav (components/ui/bottom-nav.tsx) below this list, so the same
 * clearance is always correct.
 */
export function NotesList({
  notes,
  onPress,
  onDelete,
  emptyMessage,
  ListHeaderComponent,
}: {
  notes: NoteRow[];
  onPress: (note: NoteRow) => void;
  onDelete: (note: NoteRow) => void;
  emptyMessage: string;
  ListHeaderComponent?: ComponentType<unknown> | ReactElement | null;
}) {
  return (
    <FlatList
      data={notes}
      keyExtractor={(note) => String(note.id)}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={[
        styles.content,
        notes.length === 0 && styles.emptyContent,
      ]}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <NoteCard
          note={item}
          onPress={() => onPress(item)}
          onDelete={() => onDelete(item)}
        />
      )}
      ListEmptyComponent={
        <ThemedText style={styles.empty}>{emptyMessage}</ThemedText>
      }
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
  separator: {
    height: 12,
  },
  empty: {
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
