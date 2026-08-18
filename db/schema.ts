import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * A flat, user-named container for Notes. No parent/child relationship,
 * no color/icon field — the folder icon is a single fixed default
 * rendered by the UI, not stored per-folder. See CONTEXT.md ("Folder").
 */
export const folders = sqliteTable('folders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * A single rich-text document. Has no separate title field — its title
 * is derived from the first line of `content` (see `deriveTitle` in
 * `repository.ts`). `folderId` null means the Note is Unfiled.
 *
 * `content` is stored as a plain serialized field, per ADR-0001: search
 * and title derivation operate on that field as a whole, not on
 * individual formatting marks.
 */
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull().default(''),
  folderId: integer('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const foldersRelations = relations(folders, ({ many }) => ({
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  folder: one(folders, {
    fields: [notes.folderId],
    references: [folders.id],
  }),
}));

export type FolderRow = typeof folders.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
