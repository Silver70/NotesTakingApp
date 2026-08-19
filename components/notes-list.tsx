import type { ComponentType, ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  type ScrollHandlerProcessed,
} from "react-native-reanimated";

import { NoteCard } from "@/components/notes/note-card";
import { EmptyState } from "@/components/ui/empty-state";
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
 * through as a prop: every current caller also renders the floating nav
 * pill and "+" button (components/ui/nav-pill.tsx) below this list, so the
 * same clearance is always correct.
 *
 * An `Animated.FlatList` rather than a plain one so a caller can drive a
 * collapsing header off its scroll position (see `onScroll`, and
 * app/(tabs)/(home)/index.tsx). Callers that don't pass a handler get an
 * ordinary list — Reanimated adds no cost when nothing is subscribed.
 */
export function NotesList({
  notes,
  onPress,
  onDelete,
  emptyTitle,
  emptyMessage,
  ListHeaderComponent,
  onScroll,
}: {
  notes: NoteRow[];
  onPress: (note: NoteRow) => void;
  onDelete: (note: NoteRow) => void;
  /** The heading over the empty state's illustration. */
  emptyTitle: string;
  /** The line under it — what to do about the emptiness. */
  emptyMessage: string;
  ListHeaderComponent?: ComponentType<unknown> | ReactElement | null;
  /** Reanimated scroll handler, for a caller collapsing a header against
   * this list's scroll position. */
  onScroll?: ScrollHandlerProcessed<Record<string, unknown>>;
}) {
  return (
    <Animated.FlatList
      data={notes}
      keyExtractor={(note) => String(note.id)}
      ListHeaderComponent={ListHeaderComponent}
      onScroll={onScroll}
      // 16ms: the header collapse is driven off every frame of scroll, so
      // a coarser interval would make it visibly step.
      scrollEventThrottle={16}
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
        // Wrapped in its own flexing view rather than centred by the
        // content container: `justifyContent` there centres *everything*
        // inside it, `ListHeaderComponent` included — which left Home's
        // title, search bar, and Folders row floating mid-screen until the
        // first Note existed, then snapping to the top the moment one did.
        // Giving the message the leftover space instead centres it without
        // moving the header at all.
        <View style={styles.emptyWrap}>
          <EmptyState title={emptyTitle} message={emptyMessage} />
        </View>
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
    // Lets `emptyWrap` below have leftover space to claim. Without it the
    // content container is only as tall as the header and the message
    // sits directly under it rather than in the middle of what's left.
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  separator: {
    height: 12,
  },
});
