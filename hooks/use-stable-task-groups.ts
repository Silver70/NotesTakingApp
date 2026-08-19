import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTaskGroups } from '@/hooks/use-notes-store';
import type { NoteWithFolder } from '@/lib/notes/store';
import { applyTaskOrder, captureTaskOrder, type TaskGroup, type TaskOrder } from '@/lib/notes/tasks';

/**
 * The Tasks rollup, in an order that holds still while the user is
 * looking at it.
 *
 * The data underneath is fully live — it comes straight from the store,
 * so an edit made anywhere is reflected here immediately. Only the
 * *order* is frozen, and only until this screen is next focused: without
 * that, ticking an item would both drop it below the remaining open items
 * and float its Note to the top of the screen (the `updatedAt` bump a
 * real edit earns), rearranging the list under the finger that tapped it.
 *
 * See `applyTaskOrder` in lib/notes/tasks.ts for what "re-order to match"
 * means precisely, and for how items that appeared since the snapshot are
 * placed.
 */
export function useStableTaskGroups(): TaskGroup<NoteWithFolder>[] {
  const groups = useTaskGroups();

  // The order to render in. Null before the first focus, which is the
  // one render where the derived order is already the right one.
  const [order, setOrder] = useState<TaskOrder | null>(null);

  // Lets the focus callback below snapshot the *current* groups without
  // taking `groups` as a dependency — which would re-run it (and so
  // re-freeze the order) on every store change, defeating the point.
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  useFocusEffect(
    useCallback(() => {
      // Re-derive on arrival: whatever happened while this screen was
      // away (a Note edited in the editor, items ticked elsewhere) should
      // land in its natural, freshly-sorted order.
      setOrder(captureTaskOrder(groupsRef.current));
    }, []),
  );

  // Focus can arrive before the store's first load does — reaching Tasks
  // from a cold start, or on a slow device — and the snapshot taken then
  // is empty, which would leave the order unfrozen for as long as the
  // user stays on this screen. Take the real one as soon as there is
  // something to take.
  useEffect(() => {
    if (order !== null && order.noteIds.length === 0 && groups.length > 0) {
      setOrder(captureTaskOrder(groups));
    }
  }, [order, groups]);

  return useMemo(() => (order ? applyTaskOrder(groups, order) : groups), [groups, order]);
}
