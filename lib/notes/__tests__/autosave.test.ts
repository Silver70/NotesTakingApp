import { decideAutosave, decideOnLeave } from '../autosave';

// A serialized TenTap/ProseMirror doc (ticket 04) with no visible text —
// what an "empty" rich-text Note round-trips as, unlike ticket 03's plain
// text where blank was always a literal empty (or whitespace) string.
const emptyRichDoc = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
const richDocWithText = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
});

describe('decideAutosave', () => {
  it('does nothing while rich-text content has no visible text', () => {
    expect(decideAutosave({ noteId: null }, emptyRichDoc)).toEqual({ type: 'none' });
  });

  it('creates the note on the first rich-text content with visible text', () => {
    expect(decideAutosave({ noteId: null }, richDocWithText)).toEqual({
      type: 'create',
      content: richDocWithText,
    });
  });

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
  it('deletes a persisted note left with a rich-text document with no visible text', () => {
    expect(decideOnLeave({ noteId: 5 }, emptyRichDoc)).toEqual({ type: 'delete', noteId: 5 });
  });

  it('flushes a pending update for a persisted note with rich-text content', () => {
    expect(decideOnLeave({ noteId: 5 }, richDocWithText)).toEqual({
      type: 'update',
      noteId: 5,
      content: richDocWithText,
    });
  });

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
