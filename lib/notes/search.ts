/**
 * Global search (ticket 06) must show which Folder each result belongs to
 * (or that it's Unfiled) — but `NotesRepository.searchNotes` returns plain
 * `NoteRow`s, the same shape `listNotes` does, with no folder name joined
 * in. Rather than growing the repository's return shape for this one
 * screen, the search screen fetches notes and folders separately (both
 * already-existing repository calls) and this pure function reconciles
 * them, same "kept free of React and the repository" split as
 * autosave.ts/rich-text.ts.
 *
 * Typed structurally against the narrow slice of `NoteRow`/`FolderRow`
 * each side actually needs, rather than importing those types from
 * `db/schema`, so this stays a plain data-shaping function callers can
 * unit test without a database.
 */

import { firstNonBlankLine, toPlainText } from './rich-text';

interface NoteWithFolderId {
  folderId: number | null;
}

interface FolderNameLookup {
  id: number;
  name: string;
}

/**
 * Attaches each note's Folder name (`null` for Unfiled, or for a
 * `folderId` that doesn't match any given folder — defensive, since the
 * schema's FK should make that unreachable) without disturbing any other
 * field or the input order.
 */
export function withFolderContext<T extends NoteWithFolderId>(
  notes: T[],
  folders: FolderNameLookup[],
): Array<T & { folderName: string | null }> {
  const names = new Map(folders.map((folder) => [folder.id, folder.name]));
  return notes.map((note) => ({
    ...note,
    folderName: note.folderId !== null ? (names.get(note.folderId) ?? null) : null,
  }));
}

/**
 * Whether one Note's stored `content` matches a search query — the single
 * definition of "matches", shared by `NotesRepository.searchNotes` and by
 * the store's `selectSearchResults` so the two can never drift apart.
 *
 * Matches against the `toPlainText` projection, not raw `content`, now
 * that content can be a serialized rich-text document (ADR-0001): matching
 * the raw document would both miss plain-text phrases split across two
 * formatting-mark text nodes and false-positive on words that only appear
 * in the document's JSON structure (e.g. "bulletlist").
 *
 * The title check below can't currently change the result — `title` is
 * literally the first non-blank line of the same projection, so it's
 * always a substring of it — but is kept because the spec calls out
 * matching title *and* body as two separate criteria.
 *
 * `query` is expected to be non-blank and is compared case-insensitively;
 * a blank query matches everything here, so callers filter that case out
 * themselves (both do — an empty search shows no results, not all of them).
 */
export function matchesQuery(content: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  const plainText = toPlainText(content);
  const title = firstNonBlankLine(plainText).toLowerCase();
  return title.includes(needle) || plainText.toLowerCase().includes(needle);
}
