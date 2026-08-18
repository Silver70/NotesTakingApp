import { withFolderContext } from '../search';

describe('withFolderContext', () => {
  it("labels a note with no folderId as Unfiled (folderName: null)", () => {
    const [result] = withFolderContext([{ id: 1, folderId: null }], []);

    expect(result).toMatchObject({ id: 1, folderId: null, folderName: null });
  });

  it('attaches the matching folder name for a filed note', () => {
    const [result] = withFolderContext(
      [{ id: 1, folderId: 7 }],
      [{ id: 7, name: 'Work' }],
    );

    expect(result.folderName).toBe('Work');
  });

  it('falls back to null when folderId points at a folder that no longer exists', () => {
    // Defensive: shouldn't be reachable given the schema's FK, but a note
    // referencing a stale/missing folder id must degrade to "no name"
    // rather than throw.
    const [result] = withFolderContext([{ id: 1, folderId: 99 }], []);

    expect(result.folderName).toBeNull();
  });

  it('preserves every other field on the note, and the input order', () => {
    const results = withFolderContext(
      [
        { id: 1, folderId: null, content: 'first' },
        { id: 2, folderId: 7, content: 'second' },
      ],
      [{ id: 7, name: 'Work' }],
    );

    expect(results).toEqual([
      { id: 1, folderId: null, content: 'first', folderName: null },
      { id: 2, folderId: 7, content: 'second', folderName: 'Work' },
    ]);
  });

  it('returns an empty array for no notes', () => {
    expect(withFolderContext([], [{ id: 1, name: 'Work' }])).toEqual([]);
  });
});
