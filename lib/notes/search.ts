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
