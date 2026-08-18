# 02 — Local database schema and Notes repository seam

**What to build:** The `expo-sqlite` + `drizzle-orm` schema for Note (id, content, folderId nullable, createdAt, updatedAt) and Folder (id, name, createdAt), and the full Notes repository interface that every later ticket will consume: create note, update note content, delete note (hard delete), list notes (optionally scoped to a folder or Unfiled), create folder, rename folder, delete folder (sets `folderId` to null on its notes rather than deleting them), move note to folder, and search notes (matching derived title + body content, across all folders and Unfiled). This is the single seam the spec centers on — build it complete and correct once so every UI ticket after it is a thin consumer.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Note and Folder tables exist with the fields above, with migrations
- [x] Repository exposes create/update/delete/list for Notes
- [x] Repository exposes create/rename/delete/list for Folders
- [x] Repository exposes moving a Note to a different Folder or back to Unfiled
- [x] Deleting a Folder moves its Notes to Unfiled (`folderId` → null) rather than deleting them
- [x] Repository exposes a search operation matching both derived title (first line of content) and body content, across all Notes regardless of folder
- [x] Test suite runs against a real SQLite database (in-memory or temp-file), not a mocked repository, and covers every operation above including the folder-delete-moves-to-unfiled behavior

## Comments

Implemented in `db/schema.ts` + `db/repository.ts`, commit `fe08646`.

- Schema: `notes` and `folders` tables via `drizzle-orm/sqlite-core`, integer autoincrement ids, `folderId` nullable with `onDelete: 'set null'`. Migrations generated with `drizzle-kit generate` (driver: `expo`) into `drizzle/migrations/`, bundled into the app via `babel-plugin-inline-import` + Metro `.sql` resolution, applied at startup via `db/client.ts`'s `runMigrations`.
- Repository (`db/repository.ts`): `createNotesRepository(db)` factory typed against a driver-agnostic `BaseSQLiteDatabase<'sync', ...>`, so the same code runs on `expo-sqlite` (app) and `better-sqlite3` (tests). Also added `getNote`/`getFolder` single-fetch lookups beyond the ticket's explicit list — needed by ticket 03's "reopen a note" flow and cheap to include now. `NoteListScope` (`all` / `folder` / `unfiled`) covers the folder-scoped listing requirement; notes list most-recently-edited first.
- `deriveTitle(content)` takes the first non-blank line, trimmed. Both it and `searchNotes` currently treat `content` as flat plain text, matching ticket 03's "plain text" staging — ADR-0001 anticipates content becoming a richer serialized format later (ticket 04+), at which point title/search derivation may need revisiting, but that's out of this ticket's scope.
- `PRAGMA foreign_keys = ON` is set explicitly on both the expo-sqlite and better-sqlite3 connections, so the schema's declared FK (`onDelete: 'set null'`) is a real database-level backstop behind `deleteFolder`'s own transaction, not just documentation — a test exercises this directly by deleting a folder via a raw query that bypasses the repository entirely.
- Test suite: `db/__tests__/repository.test.ts` (31 cases against a real in-memory SQLite db via `db/test-utils/testDb.ts`) plus `db/__tests__/client.smoke.test.ts` (2 cases proving `db/client.ts` — the actual expo-sqlite wiring — loads cleanly under the test runner, since its bundled-migrations import path is untestable any other way in Jest). 34/34 passing; `tsc --noEmit` and `eslint` both clean.
- Ran a `/code-review` (6 parallel angles) against the diff before committing and fixed everything that converged across multiple angles: FK enforcement was declared but never turned on (now fixed, see above); `deleteFolder`'s transaction call wasn't `return`ed (now is, for consistency and future async-driver safety); the repository's `Database` type was erasing schema info it didn't need to erase (now keeps `typeof schema` so `db.query.*` stays usable — relevant for ticket 06's per-result folder lookup); and a missing `expo-asset` dependency that `expo-sqlite`'s hooks need but wasn't hoisted to `node_modules` — would have broken the real Metro bundle, not just tests, and got caught by the client smoke test.
