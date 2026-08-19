import { count, desc, eq, isNull } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { firstNonBlankLine, toPlainText } from '../lib/notes/rich-text';
import { matchesQuery } from '../lib/notes/search';
import * as schema from './schema';
import { folders, notes, type FolderRow, type NoteRow } from './schema';

/** A drizzle SQLite database wired up with this app's schema, on either
 * the expo-sqlite driver (runtime) or the better-sqlite3 driver (tests) —
 * both are synchronous drivers, so this is the shared shape the
 * repository is built against. The run-result type is erased to `unknown`
 * since the two drivers use different (and here unused) result shapes;
 * the schema type is kept so `db.query.*` stays usable through this type. */
type Database = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** A Note's title isn't stored — it's derived from the first non-blank
 * line of its content (Apple Notes-style). See CONTEXT.md ("Note").
 * `content` may be a serialized rich-text document (ticket 04) or plain
 * text (ticket 03) — `toPlainText` reconciles both into one line-per-block
 * shape before this looks for the first non-blank line. */
export function deriveTitle(content: string): string {
  return firstNonBlankLine(toPlainText(content));
}

export type NoteListScope =
  | { type: 'all' }
  | { type: 'folder'; folderId: number }
  | { type: 'unfiled' };

export interface NotesRepository {
  createNote(input?: { folderId?: number | null; content?: string }): Promise<NoteRow>;
  getNote(id: number): Promise<NoteRow | undefined>;
  updateNoteContent(id: number, content: string): Promise<NoteRow>;
  deleteNote(id: number): Promise<void>;
  /** Permanently deletes every Note. Folders are untouched — deleting a
   * Folder is a separate action that never deletes Notes, and the reverse
   * holds here (see CONTEXT.md, "Folder"). Same hard delete as
   * `deleteNote`, just unfiltered: no Trash, no recovery (ADR-0003), so
   * callers must confirm with the user first. */
  deleteAllNotes(): Promise<void>;
  listNotes(scope?: NoteListScope): Promise<NoteRow[]>;
  moveNote(id: number, folderId: number | null): Promise<NoteRow>;
  searchNotes(query: string): Promise<NoteRow[]>;
  /** How many Notes exist, across every Folder and Unfiled. Counted in
   * SQL rather than by measuring `listNotes()`, which would drag every
   * Note's full content across for a number. */
  countNotes(): Promise<number>;

  createFolder(name: string): Promise<FolderRow>;
  getFolder(id: number): Promise<FolderRow | undefined>;
  renameFolder(id: number, name: string): Promise<FolderRow>;
  deleteFolder(id: number): Promise<void>;
  listFolders(): Promise<FolderRow[]>;
  countFolders(): Promise<number>;
}

export function createNotesRepository(db: Database): NotesRepository {
  async function requireFolder(folderId: number): Promise<void> {
    const [row] = await db.select().from(folders).where(eq(folders.id, folderId));
    if (!row) {
      throw new NotFoundError(`Folder ${folderId} not found`);
    }
  }

  return {
    async createNote(input) {
      const folderId = input?.folderId ?? null;
      if (folderId !== null) {
        await requireFolder(folderId);
      }
      const [row] = await db
        .insert(notes)
        .values({ content: input?.content ?? '', folderId })
        .returning();
      return row;
    },

    async getNote(id) {
      const [row] = await db.select().from(notes).where(eq(notes.id, id));
      return row;
    },

    async updateNoteContent(id, content) {
      const [row] = await db
        .update(notes)
        .set({ content, updatedAt: new Date() })
        .where(eq(notes.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(`Note ${id} not found`);
      }
      return row;
    },

    async deleteNote(id) {
      await db.delete(notes).where(eq(notes.id, id));
    },

    async deleteAllNotes() {
      await db.delete(notes);
    },

    async listNotes(scope = { type: 'all' }) {
      const where =
        scope.type === 'folder'
          ? eq(notes.folderId, scope.folderId)
          : scope.type === 'unfiled'
            ? isNull(notes.folderId)
            : undefined;
      return db
        .select()
        .from(notes)
        .where(where)
        .orderBy(desc(notes.updatedAt));
    },

    async moveNote(id, folderId) {
      if (folderId !== null) {
        await requireFolder(folderId);
      }
      const [row] = await db
        .update(notes)
        .set({ folderId, updatedAt: new Date() })
        .where(eq(notes.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(`Note ${id} not found`);
      }
      return row;
    },

    async searchNotes(query) {
      const q = query.trim();
      if (!q) {
        return [];
      }
      // `content` is opaque to SQL (ADR-0001), so there's no index to push
      // this into — every Note is read and filtered in memory. The
      // predicate itself lives in lib/notes/search.ts, shared with the
      // store's `selectSearchResults`, so the two can't drift apart.
      const all = await db.select().from(notes).orderBy(desc(notes.updatedAt));
      return all.filter((note) => matchesQuery(note.content, q));
    },

    async countNotes() {
      const [row] = await db.select({ value: count() }).from(notes);
      return row.value;
    },

    async createFolder(name) {
      const [row] = await db.insert(folders).values({ name }).returning();
      return row;
    },

    async getFolder(id) {
      const [row] = await db.select().from(folders).where(eq(folders.id, id));
      return row;
    },

    async renameFolder(id, name) {
      const [row] = await db
        .update(folders)
        .set({ name })
        .where(eq(folders.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(`Folder ${id} not found`);
      }
      return row;
    },

    async deleteFolder(id) {
      // A deleted Folder's Notes move to Unfiled (folderId -> null) rather
      // than being deleted themselves — see CONTEXT.md ("Folder") and
      // ADR-0003. Both steps run in one transaction so a Note can never be
      // observed still pointing at a Folder that no longer exists.
      return db.transaction((tx) => {
        tx.update(notes).set({ folderId: null }).where(eq(notes.folderId, id)).run();
        tx.delete(folders).where(eq(folders.id, id)).run();
      });
    },

    async listFolders() {
      return db.select().from(folders).orderBy(folders.name);
    },

    async countFolders() {
      const [row] = await db.select({ value: count() }).from(folders);
      return row.value;
    },
  };
}
