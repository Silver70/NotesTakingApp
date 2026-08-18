# 02 — Local database schema and Notes repository seam

**What to build:** The `expo-sqlite` + `drizzle-orm` schema for Note (id, content, folderId nullable, createdAt, updatedAt) and Folder (id, name, createdAt), and the full Notes repository interface that every later ticket will consume: create note, update note content, delete note (hard delete), list notes (optionally scoped to a folder or Unfiled), create folder, rename folder, delete folder (sets `folderId` to null on its notes rather than deleting them), move note to folder, and search notes (matching derived title + body content, across all folders and Unfiled). This is the single seam the spec centers on — build it complete and correct once so every UI ticket after it is a thin consumer.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Note and Folder tables exist with the fields above, with migrations
- [ ] Repository exposes create/update/delete/list for Notes
- [ ] Repository exposes create/rename/delete/list for Folders
- [ ] Repository exposes moving a Note to a different Folder or back to Unfiled
- [ ] Deleting a Folder moves its Notes to Unfiled (`folderId` → null) rather than deleting them
- [ ] Repository exposes a search operation matching both derived title (first line of content) and body content, across all Notes regardless of folder
- [ ] Test suite runs against a real SQLite database (in-memory or temp-file), not a mocked repository, and covers every operation above including the folder-delete-moves-to-unfiled behavior
