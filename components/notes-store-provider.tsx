import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import { useNotesRepository } from '@/db/context';
import type { FolderRow, NoteRow } from '@/db/schema';
import {
  NotesActionsContext,
  NotesStateContext,
  type NotesActions,
} from '@/hooks/use-notes-store';
import { initialNotesState, notesReducer } from '@/lib/notes/store';

/**
 * Owns the app's Notes and Folders and is the only thing that writes them.
 *
 * The state itself, and every transition over it, live in
 * lib/notes/store.ts as a pure reducer (unit tested in
 * lib/notes/__tests__/store.test.ts). This component's whole job is the
 * part that can't be pure: holding that reducer for the app's lifetime,
 * loading it once from the database, and pairing each write with the
 * action that describes it.
 *
 * **Why a store at all.** Every list screen used to keep its own
 * `useState` copy of the Notes it showed and re-fetch on focus, because a
 * Note created or edited in the editor was invisible to the screen behind
 * it. That meant five copies of the same data that could disagree, five
 * reload paths, and a hand-rolled stale-response guard in three of them.
 * With one shared copy, an edit anywhere is an edit everywhere: the
 * screen behind the editor is already correct by the time it's revealed,
 * so there is nothing to re-fetch and no race to guard.
 *
 * **Writes are optimistic.** Each action applies to state as soon as the
 * repository confirms it, and a failed write refreshes from the database
 * rather than leaving a change on screen that isn't on disk — the same
 * "state first, persistence behind it" stance `PreferencesProvider`
 * takes, and for the same reason: the UI should answer to the tap, not to
 * a round trip.
 *
 * Must be rendered inside `DatabaseProvider`.
 */
export function NotesStoreProvider({ children }: { children: ReactNode }) {
  const repo = useNotesRepository();
  const [state, dispatch] = useReducer(notesReducer, initialNotesState);

  const refresh = useCallback(async () => {
    dispatch({ type: 'loadStarted' });
    try {
      const [notes, folders] = await Promise.all([repo.listNotes(), repo.listFolders()]);
      dispatch({ type: 'loadSucceeded', notes, folders });
    } catch (error) {
      console.error('Failed to load notes and folders', error);
      dispatch({
        type: 'loadFailed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [repo]);

  // One load for the whole app, at startup — not one per screen per focus.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Runs a write, folds its result into state, and — if it fails — puts
   * state back in step with the database before rethrowing.
   *
   * The rethrow matters: callers own the user-facing failure (an Alert,
   * a retry, a route change), and several of them decide what to do next
   * from whether the write threw. Swallowing it here would leave them
   * reporting success for a write that never happened.
   */
  const commit = useCallback(
    async <T,>(write: () => Promise<T>, describe: (result: T) => Parameters<typeof dispatch>[0]) => {
      try {
        const result = await write();
        dispatch(describe(result));
        return result;
      } catch (error) {
        void refresh();
        throw error;
      }
    },
    [refresh],
  );

  // Deliberately does NOT depend on `state`: these actions are stable for
  // the app's lifetime, which is what lets consumers hold them in a
  // dependency array. See the two-context comment in
  // hooks/use-notes-store.ts for what breaks otherwise.
  const actions = useMemo<NotesActions>(
    () => ({
      refresh,

      createNote: (input) =>
        commit<NoteRow>(
          () => repo.createNote(input),
          (note) => ({ type: 'noteSaved', note }),
        ),

      updateNoteContent: (id, content) =>
        commit<NoteRow>(
          () => repo.updateNoteContent(id, content),
          (note) => ({ type: 'noteSaved', note }),
        ),

      moveNote: (id, folderId) =>
        commit<NoteRow>(
          () => repo.moveNote(id, folderId),
          (note) => ({ type: 'noteSaved', note }),
        ),

      deleteNote: async (id) => {
        await commit<void>(
          () => repo.deleteNote(id),
          () => ({ type: 'noteRemoved', id }),
        );
      },

      deleteAllNotes: async () => {
        await commit<void>(
          () => repo.deleteAllNotes(),
          () => ({ type: 'allNotesRemoved' }),
        );
      },

      createFolder: (name) =>
        commit<FolderRow>(
          () => repo.createFolder(name),
          (folder) => ({ type: 'folderSaved', folder }),
        ),

      renameFolder: (id, name) =>
        commit<FolderRow>(
          () => repo.renameFolder(id, name),
          (folder) => ({ type: 'folderSaved', folder }),
        ),

      deleteFolder: async (id) => {
        await commit<void>(
          () => repo.deleteFolder(id),
          () => ({ type: 'folderRemoved', id }),
        );
      },
    }),
    [refresh, commit, repo],
  );

  return (
    <NotesActionsContext.Provider value={actions}>
      <NotesStateContext.Provider value={state}>{children}</NotesStateContext.Provider>
    </NotesActionsContext.Provider>
  );
}
