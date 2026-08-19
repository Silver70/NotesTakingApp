import { createContext, useContext, useMemo } from 'react';

import type { FolderRow, NoteRow } from '@/db/schema';
import type { NoteWithFolder, NotesState } from '@/lib/notes/store';
import {
  initialNotesState,
  selectCounts,
  selectFolder,
  selectNotesInFolder,
  selectSearchResults,
  selectTaskGroups,
} from '@/lib/notes/store';
import type { TaskGroup } from '@/lib/notes/tasks';

/**
 * The write half of the store: every way a screen can change a Note or a
 * Folder. Signatures deliberately mirror `NotesRepository`'s own, because
 * these *are* those calls — each one persists through the repository and
 * folds the result into shared state, so a caller that used to hold a
 * repository can hold this instead without restructuring.
 *
 * Screens never touch `NotesRepository` for a write any more. That's the
 * invariant that makes the state trustworthy: if a write could bypass the
 * store, the store's copy could silently go stale and every screen would
 * be back to re-fetching on focus to find out.
 */
export interface NotesActions {
  /** Re-reads everything from the database. Only needed after a write
   * that failed (to discard a rolled-back optimistic change) and once at
   * startup — not on every screen focus, which is what this store exists
   * to stop. */
  refresh: () => Promise<void>;
  createNote: (input?: { folderId?: number | null; content?: string }) => Promise<NoteRow>;
  updateNoteContent: (id: number, content: string) => Promise<NoteRow>;
  moveNote: (id: number, folderId: number | null) => Promise<NoteRow>;
  deleteNote: (id: number) => Promise<void>;
  deleteAllNotes: () => Promise<void>;
  createFolder: (name: string) => Promise<FolderRow>;
  renameFolder: (id: number, name: string) => Promise<FolderRow>;
  deleteFolder: (id: number) => Promise<void>;
}

/**
 * State and actions are two contexts, not one, and the split is load-bearing
 * rather than tidiness.
 *
 * The actions object is stable for the app's lifetime; a combined value
 * would necessarily change identity on every state change, since state is
 * part of it. That breaks any consumer holding the actions in a dependency
 * array for a reason other than re-rendering — most sharply the Note
 * editor, whose "flush or discard on the way out" cleanup is keyed to the
 * screen's lifetime (app/note/[id].tsx). With one context, a Note edited
 * anywhere in the app would re-run that cleanup mid-edit and act on a Note
 * the user hasn't left.
 *
 * The split also means a component that only writes — the editor, the
 * Folder rename/delete actions — doesn't re-render every time an unrelated
 * Note changes.
 */
export const NotesStateContext = createContext<NotesState>(initialNotesState);

/**
 * Throws if used outside the provider rather than serving a default the
 * way `PreferencesContext` does. The two differ for a real reason: a theme
 * has to exist before the database is even open (the loading screen is
 * itself themed), whereas nothing above `NotesStoreProvider` has any
 * business writing a Note — a silent no-op there would hide a wiring
 * mistake instead of surfacing it.
 */
const notWired = (): never => {
  throw new Error('Notes actions used outside a NotesStoreProvider');
};

export const NotesActionsContext = createContext<NotesActions>({
  refresh: notWired,
  createNote: notWired,
  updateNoteContent: notWired,
  moveNote: notWired,
  deleteNote: notWired,
  deleteAllNotes: notWired,
  createFolder: notWired,
  renameFolder: notWired,
  deleteFolder: notWired,
});

/**
 * The write actions — a stable reference, safe to hold in a dependency
 * array. Prefer this over `useNotesStore` wherever a component changes
 * Notes without rendering any.
 */
export function useNotesActions(): NotesActions {
  return useContext(NotesActionsContext);
}

/** The raw state, for the few callers that need more of it than a selector
 * hook below exposes. */
export function useNotesState(): NotesState {
  return useContext(NotesStateContext);
}

/** Whether the first load has resolved — what screens use to tell "you
 * have nothing" apart from "we don't know yet". */
export function useNotesLoaded(): boolean {
  return useNotesState().status !== 'loading';
}

/* -------------------------------------------------------------------------
 * Selector hooks — one per screen's view of the state. Each memoizes a
 * pure selector from lib/notes/store.ts, so a screen re-renders when its
 * own slice changes rather than on every unrelated write.
 * ---------------------------------------------------------------------- */

/** Every Note, most-recently-edited first — what Home shows. */
export function useNotes(): NoteRow[] {
  return useNotesState().notes;
}

/** Every Folder, alphabetically — Home's Folders row, and the editor's
 * "move to Folder" picker. */
export function useFolders(): FolderRow[] {
  return useNotesState().folders;
}

/**
 * One Folder and its Notes, for the Folder-browse screen.
 *
 * `missing` distinguishes "this Folder no longer exists" from "not loaded
 * yet" — the screen shows a different thing for each, and a bare
 * `undefined` folder can't tell them apart. It's only ever true once the
 * first load has resolved.
 */
export function useFolderView(folderId: number): {
  folder: FolderRow | undefined;
  notes: NoteRow[];
  missing: boolean;
} {
  const state = useNotesState();
  return useMemo(() => {
    const folder = Number.isFinite(folderId) ? selectFolder(state, folderId) : undefined;
    return {
      folder,
      notes: folder ? selectNotesInFolder(state, folderId) : [],
      missing: state.status !== 'loading' && folder === undefined,
    };
  }, [state, folderId]);
}

/** Search results for `query`, each carrying its Folder name. Derived from
 * the Notes already in memory — no query, so no debounce and no
 * stale-response race to guard against. */
export function useSearchResults(query: string): NoteWithFolder[] {
  const state = useNotesState();
  return useMemo(() => selectSearchResults(state, query), [state, query]);
}

/** The Tasks rollup: every checklist item across every Note, grouped by
 * the Note holding it. See `useStableTaskGroups` for the version the
 * Tasks screen actually renders. */
export function useTaskGroups(): TaskGroup<NoteWithFolder>[] {
  const state = useNotesState();
  return useMemo(() => selectTaskGroups(state), [state]);
}

/** Notes/Folders totals for Settings — `null` until the first load
 * resolves. */
export function useCounts(): { notes: number; folders: number } | null {
  const state = useNotesState();
  return useMemo(() => selectCounts(state), [state]);
}
