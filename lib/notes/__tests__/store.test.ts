import type { FolderRow, NoteRow } from '../../../db/schema';
import {
  initialNotesState,
  notesReducer,
  selectCounts,
  selectFolder,
  selectNote,
  selectNotesInFolder,
  selectSearchResults,
  selectTaskGroups,
  type NotesState,
} from '../store';

function note(id: number, overrides: Partial<NoteRow> = {}): NoteRow {
  return {
    id,
    content: `Note ${id}`,
    folderId: null,
    createdAt: new Date(2024, 0, 1),
    // Distinct per id by default, so recency ordering is unambiguous
    // without every test having to spell dates out.
    updatedAt: new Date(2024, 0, id),
    ...overrides,
  };
}

function folder(id: number, name: string): FolderRow {
  return { id, name, createdAt: new Date(2024, 0, 1) };
}

/** A state that has finished loading, holding the given rows. */
function ready(notes: NoteRow[], folders: FolderRow[] = []): NotesState {
  return notesReducer(initialNotesState, { type: 'loadSucceeded', notes, folders });
}

describe('notesReducer', () => {
  describe('loading', () => {
    it('starts out loading, with nothing in it', () => {
      expect(initialNotesState).toEqual({
        notes: [],
        folders: [],
        status: 'loading',
        error: null,
      });
    });

    it('sorts notes most-recently-edited first and folders by name', () => {
      const state = ready(
        [note(1), note(3), note(2)],
        [folder(1, 'Work'), folder(2, 'Admin')],
      );

      expect(state.notes.map((row) => row.id)).toEqual([3, 2, 1]);
      expect(state.folders.map((row) => row.name)).toEqual(['Admin', 'Work']);
      expect(state.status).toBe('ready');
    });

    it('keeps the rows already on screen while a refresh is in flight', () => {
      const loaded = ready([note(1)]);
      const refreshing = notesReducer(loaded, { type: 'loadStarted' });

      expect(refreshing.status).toBe('loading');
      expect(refreshing.notes).toHaveLength(1);
    });

    it('records the failure without discarding what it already had', () => {
      const loaded = ready([note(1)]);
      const failed = notesReducer(loaded, { type: 'loadFailed', message: 'disk is gone' });

      expect(failed.status).toBe('error');
      expect(failed.error).toBe('disk is gone');
      expect(failed.notes).toHaveLength(1);
    });

    it('clears a previous error on the next attempt', () => {
      const failed = notesReducer(initialNotesState, {
        type: 'loadFailed',
        message: 'disk is gone',
      });

      expect(notesReducer(failed, { type: 'loadStarted' }).error).toBeNull();
    });
  });

  describe('noteSaved', () => {
    it('inserts a note it has never seen', () => {
      const state = notesReducer(ready([note(1)]), { type: 'noteSaved', note: note(2) });

      expect(state.notes.map((row) => row.id)).toEqual([2, 1]);
    });

    it('replaces a note it already has rather than duplicating it', () => {
      const edited = note(1, { content: 'edited' });
      const state = notesReducer(ready([note(1), note(2)]), { type: 'noteSaved', note: edited });

      expect(state.notes).toHaveLength(2);
      expect(selectNote(state, 1)?.content).toBe('edited');
    });

    it('re-sorts an edited note to the front, as a fresher updatedAt should', () => {
      const bumped = note(1, { updatedAt: new Date(2024, 5, 1) });
      const state = notesReducer(ready([note(1), note(2), note(3)]), {
        type: 'noteSaved',
        note: bumped,
      });

      expect(state.notes.map((row) => row.id)).toEqual([1, 3, 2]);
    });
  });

  describe('removal', () => {
    it('removes one note and leaves the rest alone', () => {
      const state = notesReducer(ready([note(1), note(2)]), { type: 'noteRemoved', id: 1 });

      expect(state.notes.map((row) => row.id)).toEqual([2]);
    });

    it('ignores a note that is already gone', () => {
      const before = ready([note(1)]);

      expect(notesReducer(before, { type: 'noteRemoved', id: 99 }).notes).toHaveLength(1);
    });

    it('keeps folders when every note is deleted', () => {
      const before = ready([note(1), note(2)], [folder(1, 'Work')]);
      const state = notesReducer(before, { type: 'allNotesRemoved' });

      expect(state.notes).toEqual([]);
      expect(state.folders).toHaveLength(1);
    });
  });

  describe('folderSaved', () => {
    it('inserts a new folder in name order', () => {
      const state = notesReducer(ready([], [folder(1, 'Admin'), folder(2, 'Work')]), {
        type: 'folderSaved',
        folder: folder(3, 'Personal'),
      });

      expect(state.folders.map((row) => row.name)).toEqual(['Admin', 'Personal', 'Work']);
    });

    it('re-sorts a renamed folder rather than adding a second one', () => {
      const state = notesReducer(ready([], [folder(1, 'Admin'), folder(2, 'Work')]), {
        type: 'folderSaved',
        folder: folder(2, 'Aaa'),
      });

      expect(state.folders.map((row) => row.name)).toEqual(['Aaa', 'Admin']);
    });
  });

  describe('folderRemoved', () => {
    // The behaviour that lets the store skip a refetch after a delete:
    // it has to predict the repository's transaction exactly.
    it('moves the deleted folder’s notes to Unfiled rather than deleting them', () => {
      const before = ready(
        [note(1, { folderId: 7 }), note(2, { folderId: 8 }), note(3)],
        [folder(7, 'Work'), folder(8, 'Admin')],
      );
      const state = notesReducer(before, { type: 'folderRemoved', id: 7 });

      expect(state.folders.map((row) => row.id)).toEqual([8]);
      expect(state.notes).toHaveLength(3);
      expect(selectNote(state, 1)?.folderId).toBeNull();
      // A note in a different folder is untouched.
      expect(selectNote(state, 2)?.folderId).toBe(8);
    });
  });
});

describe('selectors', () => {
  const notes = [
    note(1, { folderId: 7, content: 'Buy milk and eggs' }),
    note(2, { folderId: 7, content: 'Trip planning' }),
    note(3, { content: 'Unfiled thoughts about MILK' }),
  ];
  const folders = [folder(7, 'Home'), folder(8, 'Empty')];
  const state = ready(notes, folders);

  it('finds one note or one folder by id, and reports a miss as undefined', () => {
    expect(selectNote(state, 2)?.content).toBe('Trip planning');
    expect(selectNote(state, 99)).toBeUndefined();
    expect(selectFolder(state, 7)?.name).toBe('Home');
    expect(selectFolder(state, 99)).toBeUndefined();
  });

  it('scopes notes to a folder, newest first', () => {
    expect(selectNotesInFolder(state, 7).map((row) => row.id)).toEqual([2, 1]);
    expect(selectNotesInFolder(state, 8)).toEqual([]);
  });

  describe('search', () => {
    it('matches case-insensitively across every folder and Unfiled', () => {
      const results = selectSearchResults(state, 'milk');

      expect(results.map((row) => row.id).sort()).toEqual([1, 3]);
    });

    it('attaches each result’s folder name, null for Unfiled', () => {
      const results = selectSearchResults(state, 'milk');

      expect(results.find((row) => row.id === 1)?.folderName).toBe('Home');
      expect(results.find((row) => row.id === 3)?.folderName).toBeNull();
    });

    it('returns nothing for a blank query rather than everything', () => {
      expect(selectSearchResults(state, '')).toEqual([]);
      expect(selectSearchResults(state, '   ')).toEqual([]);
    });
  });

  describe('task groups', () => {
    const checklist = JSON.stringify({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Groceries' }] },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'milk' }] }],
            },
          ],
        },
      ],
    });

    it('rolls up checklist items with their folder context, skipping notes that have none', () => {
      const withTasks = ready([note(1, { folderId: 7, content: checklist }), note(2)], folders);
      const groups = selectTaskGroups(withTasks);

      expect(groups).toHaveLength(1);
      expect(groups[0].note.id).toBe(1);
      expect(groups[0].note.folderName).toBe('Home');
      expect(groups[0].tasks.map((task) => task.text)).toEqual(['milk']);
    });
  });

  describe('counts', () => {
    it('is null before the first load, so Settings can show a dash not a zero', () => {
      expect(selectCounts(initialNotesState)).toBeNull();
    });

    it('counts what the store holds once loaded', () => {
      expect(selectCounts(state)).toEqual({ notes: 3, folders: 2 });
    });

    it('reports a genuinely empty library as zero, not as unknown', () => {
      expect(selectCounts(ready([], []))).toEqual({ notes: 0, folders: 0 });
    });
  });
});
