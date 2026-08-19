import {
  EMPTY_DOC,
  toDoc,
  toEditorContent,
  toPlainText,
} from '../rich-text';

// A TenTap/ProseMirror doc shaped roughly like what `editor.getJSON()`
// produces for "Groceries" (h1) followed by a "milk" bullet list item.
const richDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Groceries' }] },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'milk' }] }],
        },
      ],
    },
  ],
};

const emptyDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

describe('toPlainText', () => {
  it('walks a rich-text document into one line per block', () => {
    expect(toPlainText(JSON.stringify(richDoc))).toBe('Groceries\nmilk\n');
  });

  it('treats a content-less document as blank', () => {
    expect(toPlainText(JSON.stringify(emptyDoc)).trim()).toBe('');
  });

  it('treats a bare empty doc (no content array at all) as blank', () => {
    expect(toPlainText(JSON.stringify({ type: 'doc' })).trim()).toBe('');
  });

  it('passes ticket 03 plain text through unchanged', () => {
    expect(toPlainText('Title here\nbody')).toBe('Title here\nbody');
  });

  it('treats an empty string as blank', () => {
    expect(toPlainText('')).toBe('');
  });

  it('does not throw on a malformed doc whose content is not an array', () => {
    // Only `type === 'doc'` is validated on the way in — a corrupted row
    // or a future writer's bug could still produce a non-array `content`
    // at any depth. Must degrade to "no visible text", not crash.
    const malformed = { type: 'doc', content: 'not an array' };
    expect(toPlainText(JSON.stringify(malformed))).toBe('');

    const malformedNested = {
      type: 'doc',
      content: [{ type: 'paragraph', content: 'also not an array' }],
    };
    expect(() => toPlainText(JSON.stringify(malformedNested))).not.toThrow();
  });

  it('renders a checklist item as its own line', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'buy eggs' }] }],
            },
          ],
        },
      ],
    };
    expect(toPlainText(JSON.stringify(doc))).toContain('buy eggs');
  });

  it('preserves a deliberate blank line between two paragraphs', () => {
    // Distinguishes a genuinely empty top-level paragraph (the user
    // pressing Enter twice) from the listItem/taskItem-wraps-a-paragraph
    // case above, which must collapse rather than double up.
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Apple' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Banana' }] },
      ],
    };
    expect(toPlainText(JSON.stringify(doc))).toBe('Apple\n\nBanana\n');
  });

  it('still ends the paragraph after a mid-paragraph hard break followed by more text', () => {
    // Regression: a hard break ending a line partway through a paragraph
    // must not fool the paragraph into skipping its *own* trailing break
    // just because some earlier child already ended a (different) line.
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Line1' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Line2' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Line3' }] },
      ],
    };
    expect(toPlainText(JSON.stringify(doc))).toBe('Line1\nLine2\nLine3\n');
  });
});

describe('toEditorContent', () => {
  it('returns undefined for an empty (brand new) Note', () => {
    expect(toEditorContent('')).toBeUndefined();
  });

  it('parses a serialized rich-text document back into an object', () => {
    expect(toEditorContent(JSON.stringify(richDoc))).toEqual(richDoc);
  });

  it('wraps ticket 03 plain text as a document, one paragraph per line', () => {
    // Handing TenTap the raw string would have it parsed as HTML, where
    // '\n' is insignificant whitespace — every line would collapse onto
    // one. Wrapping each line as its own paragraph node preserves them.
    expect(toEditorContent('Title here\nbody')).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Title here' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'body' }] },
      ],
    });
  });
});

describe('toDoc', () => {
  it('falls back to EMPTY_DOC for a brand new Note instead of undefined', () => {
    expect(toDoc('')).toEqual(EMPTY_DOC);
  });

  it('otherwise behaves exactly like toEditorContent', () => {
    expect(toDoc(JSON.stringify(richDoc))).toEqual(richDoc);
  });
});
