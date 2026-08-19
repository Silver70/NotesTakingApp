/**
 * The app's Notes/Folders state as a pure reducer, kept free of React and
 * of the database the same way autosave.ts and rich-text.ts are.
 *
 * Every screen used to hold its own `useState` copy of the Notes it
 * showed and re-fetch it on focus, which meant five independent copies of
 * the same data, five reload paths, and a hand-rolled stale-response guard
 * in each. This module is the single source of truth those screens now
 * share: one `NotesState`, one set of transitions, and pure selectors that
 * derive each screen's view of it (a Folder's Notes, search results, the
 * Tasks rollup, the Settings counts) rather than re-querying for them.
 *
 * Kept separate from the provider that owns it
 * (components/notes-store-provider.tsx) so the transitions and selectors
 * can be unit tested directly — no database, no React, no renderer.
 */

import type { FolderRow, NoteRow } from '../../db/schema';
import { matchesQuery, withFolderContext } from './search';
import { collectTasks, type TaskGroup } from './tasks';

/**
 * Everything the app knows about its Notes and Folders right now.
 *
 * `status` is deliberately separate from emptiness: an empty `notes`
 * array means something different while still loading ("we don't know
 * yet") than it does once ready ("you have no Notes"), and screens render
 * a different thing for each.
 */
export interface NotesState {
  notes: NoteRow[];
  folders: FolderRow[];
  status: 'loading' | 'ready' | 'error';
  /** The message from the failure that put `status` in `'error'`, if any. */
  error: string | null;
}

export const initialNotesState: NotesState = {
  notes: [],
  folders: [],
  status: 'loading',
  error: null,
};

/**
 * Every way this state can change. Named for what *happened* rather than
 * for the setter to call ("noteSaved", not "setNote"), so the log of
 * actions reads as a history of the app rather than a list of writes.
 */
export type NotesAction =
  | { type: 'loadStarted' }
  | { type: 'loadSucceeded'; notes: NoteRow[]; folders: FolderRow[] }
  | { type: 'loadFailed'; message: string }
  /** A Note created or updated — inserted if new, replaced if it exists. */
  | { type: 'noteSaved'; note: NoteRow }
  | { type: 'noteRemoved'; id: number }
  | { type: 'allNotesRemoved' }
  /** A Folder created or renamed — inserted if new, replaced if it exists. */
  | { type: 'folderSaved'; folder: FolderRow }
  | { type: 'folderRemoved'; id: number };

/** Most-recently-edited first — the order every Notes list in the app
 * shows, applied here so no screen has to re-sort and none can disagree. */
function byRecency(notes: NoteRow[]): NoteRow[] {
  return [...notes].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** Alphabetical, matching `NotesRepository.listFolders`'s own ordering so
 * an optimistically-inserted Folder lands where a reload would put it. */
function byName(folders: FolderRow[]): FolderRow[] {
  return [...folders].sort((a, b) => a.name.localeCompare(b.name));
}

/** Replaces the entry with a matching `id`, or appends it if there is
 * none — the same "create or update" shape both `noteSaved` and
 * `folderSaved` need. */
function upsert<T extends { id: number }>(rows: T[], row: T): T[] {
  const index = rows.findIndex((candidate) => candidate.id === row.id);
  if (index === -1) {
    return [...rows, row];
  }
  const next = [...rows];
  next[index] = row;
  return next;
}

export function notesReducer(state: NotesState, action: NotesAction): NotesState {
  switch (action.type) {
    case 'loadStarted':
      // Deliberately keeps the current rows on screen rather than
      // blanking them: a refresh behind an already-populated list should
      // not flash it empty.
      return { ...state, status: 'loading', error: null };

    case 'loadSucceeded':
      return {
        notes: byRecency(action.notes),
        folders: byName(action.folders),
        status: 'ready',
        error: null,
      };

    case 'loadFailed':
      return { ...state, status: 'error', error: action.message };

    case 'noteSaved':
      return { ...state, notes: byRecency(upsert(state.notes, action.note)) };

    case 'noteRemoved':
      return { ...state, notes: state.notes.filter((note) => note.id !== action.id) };

    case 'allNotesRemoved':
      // Folders are untouched — deleting every Note never deletes a
      // Folder (see CONTEXT.md, "Folder"), and the repository's
      // `deleteAllNotes` this mirrors leaves them alone too.
      return { ...state, notes: [] };

    case 'folderSaved':
      return { ...state, folders: byName(upsert(state.folders, action.folder)) };

    case 'folderRemoved':
      // Mirrors `NotesRepository.deleteFolder`'s transaction: a deleted
      // Folder's Notes move to Unfiled rather than being deleted with it
      // (CONTEXT.md, "Folder"). Applying the same rule here is what keeps
      // this state a faithful prediction of what the database now holds,
      // so no refetch is needed to find out.
      return {
        ...state,
        folders: state.folders.filter((folder) => folder.id !== action.id),
        notes: state.notes.map((note) =>
          note.folderId === action.id ? { ...note, folderId: null } : note,
        ),
      };
  }
}

/* -------------------------------------------------------------------------
 * Selectors — each screen's view of the state above, derived rather than
 * fetched. All pure, so screens can memoize them and tests can assert on
 * them without a database.
 * ---------------------------------------------------------------------- */

/** One Note by id, or undefined if it isn't there (deleted elsewhere, or
 * never existed). */
export function selectNote(state: NotesState, id: number): NoteRow | undefined {
  return state.notes.find((note) => note.id === id);
}

/** One Folder by id, or undefined — what the Folder screen uses to tell
 * "still loading" from "this Folder no longer exists", together with
 * `state.status`. */
export function selectFolder(state: NotesState, id: number): FolderRow | undefined {
  return state.folders.find((folder) => folder.id === id);
}

/** The Notes filed under one Folder, in the same recency order as every
 * other list. Replaces a `listNotes({ type: 'folder' })` round trip. */
export function selectNotesInFolder(state: NotesState, folderId: number): NoteRow[] {
  return state.notes.filter((note) => note.folderId === folderId);
}

/** A Note plus the name of the Folder it lives in — the shape both Search
 * results and the Tasks rollup render. */
export type NoteWithFolder = NoteRow & { folderName: string | null };

/**
 * Global search, derived from state rather than re-queried (ticket 06).
 * `NotesRepository.searchNotes` always read every Note and filtered them
 * in JS — `content` is opaque to SQL (ADR-0001), so there was never an
 * index to use — which means running the same `matchesQuery` predicate
 * over the Notes already in memory returns exactly the same results
 * without the round trip, and without a debounce or a stale-response
 * guard to keep those round trips in order.
 */
export function selectSearchResults(state: NotesState, query: string): NoteWithFolder[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const matches = state.notes.filter((note) => matchesQuery(note.content, trimmed));
  return withFolderContext(matches, state.folders);
}

/** The Tasks rollup (ticket 10): every checklist item in every Note,
 * grouped by the Note holding it, each carrying its Folder context. */
export function selectTaskGroups(state: NotesState): TaskGroup<NoteWithFolder>[] {
  return collectTasks(withFolderContext(state.notes, state.folders));
}

/** The Notes/Folders totals the Settings screen shows. `null` until the
 * first load resolves, so Settings can render an em dash rather than a
 * zero that would read as "you have nothing". */
export function selectCounts(state: NotesState): { notes: number; folders: number } | null {
  if (state.status === 'loading' && state.notes.length === 0 && state.folders.length === 0) {
    return null;
  }
  return { notes: state.notes.length, folders: state.folders.length };
}
