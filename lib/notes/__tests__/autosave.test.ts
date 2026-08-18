import { decideAutosave, decideOnLeave } from '../autosave';

describe('decideAutosave', () => {
  it('does nothing while content is blank', () => {
    expect(decideAutosave({ noteId: null }, '')).toEqual({ type: 'none' });
    expect(decideAutosave({ noteId: null }, '   \n  ')).toEqual({ type: 'none' });
  });

  it('does nothing for an already-persisted note whose content goes blank', () => {
    // Deletion-on-blank is a leave-time decision (decideOnLeave), not a
    // mid-edit one — see its own describe block below.
    expect(decideAutosave({ noteId: 5 }, '')).toEqual({ type: 'none' });
  });

  it('creates the note on the first non-blank content', () => {
    expect(decideAutosave({ noteId: null }, 'Hello')).toEqual({
      type: 'create',
      content: 'Hello',
    });
  });

  it('updates an already-persisted note on further edits', () => {
    expect(decideAutosave({ noteId: 5 }, 'Hello again')).toEqual({
      type: 'update',
      noteId: 5,
      content: 'Hello again',
    });
  });
});

describe('decideOnLeave', () => {
  it('does nothing for a note that was never persisted and stays blank', () => {
    expect(decideOnLeave({ noteId: null }, '')).toEqual({ type: 'none' });
    expect(decideOnLeave({ noteId: null }, '   ')).toEqual({ type: 'none' });
  });

  it('deletes a persisted note left blank', () => {
    expect(decideOnLeave({ noteId: 5 }, '')).toEqual({ type: 'delete', noteId: 5 });
    expect(decideOnLeave({ noteId: 5 }, '  \n  ')).toEqual({ type: 'delete', noteId: 5 });
  });

  it('flushes a pending create for a never-persisted note with content', () => {
    expect(decideOnLeave({ noteId: null }, 'Hello')).toEqual({
      type: 'create',
      content: 'Hello',
    });
  });

  it('flushes a pending update for a persisted note with content', () => {
    expect(decideOnLeave({ noteId: 5 }, 'Hello again')).toEqual({
      type: 'update',
      noteId: 5,
      content: 'Hello again',
    });
  });
});
