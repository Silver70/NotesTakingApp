import {
  EMPTY_DOC,
  insertTextAtPosition,
  replaceTextRange,
  toDoc,
  toEditorContent,
  toPlainText,
  type ProseMirrorDoc,
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

// Positions below are plain ProseMirror flat positions — see
// https://prosemirror.net/docs/guide/#doc.indexing. For a single-paragraph
// doc, position 0 is before the paragraph, 1 is the start of its text.
describe('insertTextAtPosition (Dictation, ticket 08)', () => {
  it('inserts into the middle of a text run', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
    };
    // Position 7 is right after "Hello ".
    const result = insertTextAtPosition(doc, 7, 'brave new ');
    expect(toPlainText(JSON.stringify(result))).toBe('Hello brave new world\n');
  });

  it('appends at the end of a text run', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    };
    // Position 6 is right after "Hello" (1 + 5 chars).
    const result = insertTextAtPosition(doc, 6, ' world');
    expect(toPlainText(JSON.stringify(result))).toBe('Hello world\n');
  });

  it('prepends at the start of a text run', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'world' }] }],
    };
    const result = insertTextAtPosition(doc, 1, 'Hello ');
    expect(toPlainText(JSON.stringify(result))).toBe('Hello world\n');
  });

  it('fills a brand new (content-less) empty paragraph', () => {
    // Position 1: the only position strictly inside an empty paragraph.
    const result = insertTextAtPosition(EMPTY_DOC, 1, 'Hello');
    expect(result).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    });
  });

  it('lands after a hardBreak rather than merging into the text before it', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'ab' }, { type: 'hardBreak' }, { type: 'text', text: 'cd' }],
        },
      ],
    };
    // Position 4: right after the hardBreak, right before "cd".
    const result = insertTextAtPosition(doc, 4, 'X');
    expect(toPlainText(JSON.stringify(result))).toBe('ab\nXcd\n');
  });

  it('inserts into a nested list item without disturbing sibling blocks', () => {
    const doc: ProseMirrorDoc = {
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
    // Position 16 is between "mi" and "lk" inside the list item's text.
    const result = insertTextAtPosition(doc, 16, 'X');
    expect(toPlainText(JSON.stringify(result))).toBe('Groceries\nmiXlk\n');
  });

  it('preserves marks on text elsewhere in the document untouched', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'plain' }] },
      ],
    };
    // Position 12 is right after "plain", inside the second paragraph's text.
    const result = insertTextAtPosition(doc, 12, '!');
    expect(result.content?.[0]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] }],
    });
    expect(toPlainText(JSON.stringify(result))).toBe('bold\nplain!\n');
  });

  it('inserts at the true end of a document without escaping the last paragraph', () => {
    // A live cursor at the very end of a note reports this exact position
    // (doc.content.size) — real ProseMirror resolves it *into* the last
    // paragraph's text, not as a schema-invalid bare sibling after it.
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
    };
    const result = insertTextAtPosition(doc, 4, '!');
    expect(result).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi!' }] }],
    });
  });

  it('inserts at the true start of a document without escaping the first paragraph', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'world' }] }],
    };
    const result = insertTextAtPosition(doc, 0, 'Hello ');
    expect(result).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
    });
  });

  it('clamps an out-of-range position instead of producing a malformed document', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
    };
    expect(toPlainText(JSON.stringify(insertTextAtPosition(doc, 999, '!')))).toBe('Hi!\n');
    expect(toPlainText(JSON.stringify(insertTextAtPosition(doc, -5, '!')))).toBe('!Hi\n');
  });
});

describe('replaceTextRange (Dictation, ticket 08)', () => {
  it('replaces a previous partial result with a refined one', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello wor' }] }],
    };
    // "wor" occupies positions [7, 10) — replace it with "world".
    const result = replaceTextRange(doc, 7, 10, 'world');
    expect(toPlainText(JSON.stringify(result))).toBe('Hello world\n');
  });

  it('behaves like a pure insert when from === to', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    };
    const result = replaceTextRange(doc, 6, 6, ' world');
    expect(toPlainText(JSON.stringify(result))).toBe('Hello world\n');
  });

  it('drops a text node entirely when the whole range replaces it', () => {
    const doc: ProseMirrorDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'scratch' }] }],
    };
    const result = replaceTextRange(doc, 1, 8, 'final');
    expect(toPlainText(JSON.stringify(result))).toBe('final\n');
  });

  it('round-trips a whole dictation session: partials refined into a final result', () => {
    let doc: ProseMirrorDoc = EMPTY_DOC;
    // "Hello" -> "Hello wor" -> "Hello world" (final).
    doc = replaceTextRange(doc, 1, 1, 'Hello');
    doc = replaceTextRange(doc, 1, 6, 'Hello wor');
    doc = replaceTextRange(doc, 1, 10, 'Hello world');
    expect(toPlainText(JSON.stringify(doc))).toBe('Hello world\n');
  });
});
