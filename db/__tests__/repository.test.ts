import { eq } from 'drizzle-orm';

import { createNotesRepository, deriveTitle, NotFoundError, type NotesRepository } from '../repository';
import { folders, notes } from '../schema';
import { createTestDatabase } from '../test-utils/testDb';

describe('Notes repository', () => {
  let db: ReturnType<typeof createTestDatabase>;
  let repo: NotesRepository;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
    db = createTestDatabase();
    repo = createNotesRepository(db);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('notes: create / update / delete', () => {
    it('creates a blank, unfiled note by default', async () => {
      const note = await repo.createNote();

      expect(note).toMatchObject({ content: '', folderId: null });
      expect(note.id).toEqual(expect.any(Number));
      expect(note.createdAt).toEqual(note.updatedAt);
    });

    it('creates a note with initial content in a given folder', async () => {
      const folder = await repo.createFolder('Work');

      const note = await repo.createNote({ folderId: folder.id, content: 'Hello' });

      expect(note).toMatchObject({ content: 'Hello', folderId: folder.id });
    });

    it('rejects creating a note in a folder that does not exist', async () => {
      await expect(repo.createNote({ folderId: 999 })).rejects.toThrow(NotFoundError);
    });

    it('updates a note content and bumps updatedAt, leaving createdAt untouched', async () => {
      const note = await repo.createNote({ content: 'first' });

      jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
      const updated = await repo.updateNoteContent(note.id, 'second');

      expect(updated.content).toBe('second');
      expect(updated.createdAt).toEqual(note.createdAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(note.updatedAt.getTime());
    });

    it('throws NotFoundError updating a note that does not exist', async () => {
      await expect(repo.updateNoteContent(999, 'x')).rejects.toThrow(NotFoundError);
    });

    it('hard-deletes a note — it is gone, not soft-deleted', async () => {
      const note = await repo.createNote({ content: 'gone soon' });

      await repo.deleteNote(note.id);

      expect(await repo.getNote(note.id)).toBeUndefined();
      expect(await repo.listNotes()).toEqual([]);
    });

    it('deleting a note that does not exist is a no-op, not an error', async () => {
      await expect(repo.deleteNote(999)).resolves.toBeUndefined();
    });

    it('reopening an existing note returns its current content', async () => {
      const note = await repo.createNote({ content: 'draft' });
      await repo.updateNoteContent(note.id, 'final');

      const reopened = await repo.getNote(note.id);

      expect(reopened?.content).toBe('final');
    });
  });

  describe('notes: listing', () => {
    it('lists every note across all folders, most-recently-edited first', async () => {
      const first = await repo.createNote({ content: 'first' });
      jest.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
      const second = await repo.createNote({ content: 'second' });
      jest.setSystemTime(new Date('2026-01-03T00:00:00.000Z'));
      await repo.updateNoteContent(first.id, 'first, edited later');

      const listed = await repo.listNotes();

      expect(listed.map((n) => n.id)).toEqual([first.id, second.id]);
    });

    it('scopes the list to a single folder', async () => {
      const folder = await repo.createFolder('Work');
      const other = await repo.createFolder('Personal');
      const inFolder = await repo.createNote({ folderId: folder.id, content: 'a' });
      await repo.createNote({ folderId: other.id, content: 'b' });
      await repo.createNote({ content: 'unfiled' });

      const listed = await repo.listNotes({ type: 'folder', folderId: folder.id });

      expect(listed.map((n) => n.id)).toEqual([inFolder.id]);
    });

    it('scopes the list to Unfiled notes', async () => {
      const folder = await repo.createFolder('Work');
      await repo.createNote({ folderId: folder.id, content: 'filed' });
      const unfiled = await repo.createNote({ content: 'unfiled' });

      const listed = await repo.listNotes({ type: 'unfiled' });

      expect(listed.map((n) => n.id)).toEqual([unfiled.id]);
    });
  });

  describe('notes: moving between folders', () => {
    it('moves a note into a folder', async () => {
      const folder = await repo.createFolder('Work');
      const note = await repo.createNote({ content: 'x' });

      const moved = await repo.moveNote(note.id, folder.id);

      expect(moved.folderId).toBe(folder.id);
    });

    it('moves a note back to Unfiled', async () => {
      const folder = await repo.createFolder('Work');
      const note = await repo.createNote({ folderId: folder.id, content: 'x' });

      const moved = await repo.moveNote(note.id, null);

      expect(moved.folderId).toBeNull();
    });

    it('rejects moving a note into a folder that does not exist', async () => {
      const note = await repo.createNote({ content: 'x' });

      await expect(repo.moveNote(note.id, 999)).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError moving a note that does not exist', async () => {
      await expect(repo.moveNote(999, null)).rejects.toThrow(NotFoundError);
    });
  });

  describe('folders', () => {
    it('creates, renames, and lists folders', async () => {
      await repo.createFolder('Work');
      const personal = await repo.createFolder('Personal');

      const renamed = await repo.renameFolder(personal.id, 'Home');

      expect(renamed.name).toBe('Home');
      expect((await repo.listFolders()).map((f) => f.name).sort()).toEqual(['Home', 'Work']);
    });

    it('throws NotFoundError renaming a folder that does not exist', async () => {
      await expect(repo.renameFolder(999, 'x')).rejects.toThrow(NotFoundError);
    });

    it("deleting a folder moves its notes to Unfiled — it never deletes the notes", async () => {
      const folder = await repo.createFolder('Work');
      const noteA = await repo.createNote({ folderId: folder.id, content: 'a' });
      const noteB = await repo.createNote({ folderId: folder.id, content: 'b' });

      await repo.deleteFolder(folder.id);

      expect(await repo.getFolder(folder.id)).toBeUndefined();
      expect((await repo.getNote(noteA.id))?.folderId).toBeNull();
      expect((await repo.getNote(noteB.id))?.folderId).toBeNull();
      expect((await repo.listNotes({ type: 'unfiled' })).map((n) => n.id).sort()).toEqual(
        [noteA.id, noteB.id].sort()
      );
    });

    it('deleting a folder with no notes just removes the folder', async () => {
      const folder = await repo.createFolder('Empty');

      await repo.deleteFolder(folder.id);

      expect(await repo.listFolders()).toEqual([]);
    });

    it('deleting a folder does not touch notes belonging to other folders', async () => {
      const folder = await repo.createFolder('Work');
      const otherFolder = await repo.createFolder('Personal');
      const untouched = await repo.createNote({ folderId: otherFolder.id, content: 'x' });

      await repo.deleteFolder(folder.id);

      expect((await repo.getNote(untouched.id))?.folderId).toBe(otherFolder.id);
    });

    it('the folder -> notes FK also nulls folderId at the database level, independent of the repository', async () => {
      // Defense-in-depth check for the `PRAGMA foreign_keys = ON` +
      // `onDelete: 'set null'` in schema.ts: bypass the repository (and
      // its own manual transaction in deleteFolder) with a raw delete,
      // and confirm the database itself upholds "a Folder's Notes move to
      // Unfiled" — not just NotesRepository.deleteFolder's application code.
      const folder = await repo.createFolder('Work');
      const note = await repo.createNote({ folderId: folder.id, content: 'x' });

      await db.delete(folders).where(eq(folders.id, folder.id));

      const [row] = await db.select().from(notes).where(eq(notes.id, note.id));
      expect(row.folderId).toBeNull();
    });
  });

  describe('search', () => {
    it('matches a note by its derived title (first line)', async () => {
      await repo.createNote({ content: 'Grocery List\nmilk\neggs' });
      await repo.createNote({ content: 'Unrelated' });

      const results = await repo.searchNotes('grocery');

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('Grocery List');
    });

    it('matches a note by body content beyond the first line', async () => {
      await repo.createNote({ content: 'Shopping\nneed to buy oat milk' });

      const results = await repo.searchNotes('oat milk');

      expect(results).toHaveLength(1);
    });

    it('is case-insensitive', async () => {
      await repo.createNote({ content: 'Roadmap for Q1' });

      const results = await repo.searchNotes('ROADMAP');

      expect(results).toHaveLength(1);
    });

    it('spans every folder and Unfiled notes at once', async () => {
      const folder = await repo.createFolder('Work');
      const filed = await repo.createNote({ folderId: folder.id, content: 'budget spreadsheet' });
      const unfiled = await repo.createNote({ content: 'budget for the trip' });
      await repo.createNote({ content: 'irrelevant note' });

      const results = await repo.searchNotes('budget');

      expect(results.map((n) => n.id).sort()).toEqual([filed.id, unfiled.id].sort());
    });

    it('returns no results for a blank query', async () => {
      await repo.createNote({ content: 'anything' });

      expect(await repo.searchNotes('   ')).toEqual([]);
    });

    it('returns no results when nothing matches', async () => {
      await repo.createNote({ content: 'anything' });

      expect(await repo.searchNotes('nonexistent')).toEqual([]);
    });
  });

  describe('deriveTitle', () => {
    it('takes the first non-blank line', () => {
      expect(deriveTitle('Title here\nbody')).toBe('Title here');
    });

    it('skips leading blank lines', () => {
      expect(deriveTitle('\n\n  \nActual title\nmore')).toBe('Actual title');
    });

    it('trims surrounding whitespace on the title line', () => {
      expect(deriveTitle('   spaced out title   \nbody')).toBe('spaced out title');
    });

    it('returns an empty string for empty content', () => {
      expect(deriveTitle('')).toBe('');
    });

    it('returns an empty string for whitespace-only content', () => {
      expect(deriveTitle('   \n   \n')).toBe('');
    });
  });
});
