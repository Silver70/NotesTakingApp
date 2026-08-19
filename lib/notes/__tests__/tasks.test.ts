import { collectTasks, extractTasks, setTaskChecked } from '../tasks';

/** A TenTap/ProseMirror doc shaped like what `editor.getJSON()` produces
 * for a heading followed by a two-item checklist, one of them ticked. */
const checklistDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Groceries' }] },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'milk' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'eggs' }] }],
        },
      ],
    },
  ],
};

const checklist = JSON.stringify(checklistDoc);

/** A checklist nested inside another checklist item — TaskItem's content
 * is `paragraph block*` when nesting is enabled. */
const nestedDoc = {
  type: 'doc',
  content: [
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'trip' }] },
            {
              type: 'taskList',
              content: [
                {
                  type: 'taskItem',
                  attrs: { checked: true },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'passport' }] }],
                },
              ],
            },
          ],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'book flights' }] }],
        },
      ],
    },
  ],
};

describe('extractTasks', () => {
  it('finds every checklist item, in document order, with its checked state', () => {
    expect(extractTasks(checklist)).toEqual([
      { index: 0, text: 'milk', checked: false },
      { index: 1, text: 'eggs', checked: true },
    ]);
  });

  it('flattens a nested checklist, numbering parent before child (document order)', () => {
    expect(extractTasks(JSON.stringify(nestedDoc))).toEqual([
      { index: 0, text: 'trip', checked: false },
      { index: 1, text: 'passport', checked: true },
      { index: 2, text: 'book flights', checked: false },
    ]);
  });

  it("keeps a nested item's text out of its parent's label", () => {
    const [parent] = extractTasks(JSON.stringify(nestedDoc));

    expect(parent.text).toBe('trip');
  });

  it('joins a multi-line item onto one line', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'call the' },
                    { type: 'hardBreak' },
                    { type: 'text', text: 'dentist' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(extractTasks(JSON.stringify(doc))[0].text).toBe('call the dentist');
  });

  it('treats a missing `checked` attribute as unchecked', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }] },
          ],
        },
      ],
    };

    expect(extractTasks(JSON.stringify(doc))[0].checked).toBe(false);
  });

  it('keeps an empty item rather than dropping it', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false } }] }],
    };

    expect(extractTasks(JSON.stringify(doc))).toEqual([{ index: 0, text: '', checked: false }]);
  });

  it('returns nothing for a rich-text Note with no checklist in it', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'just prose' }] }],
    };

    expect(extractTasks(JSON.stringify(doc))).toEqual([]);
  });

  it("returns nothing for ticket 03's plain text, which has no checklist to find", () => {
    expect(extractTasks('milk\neggs')).toEqual([]);
  });

  it('returns nothing for empty content', () => {
    expect(extractTasks('')).toEqual([]);
  });

  it('degrades to nothing on a malformed document rather than throwing', () => {
    // A non-array `content` (a bad migration, a hand-edited DB) must not
    // take the Tasks screen down — same defensiveness as rich-text.ts.
    expect(extractTasks(JSON.stringify({ type: 'doc', content: 'nope' }))).toEqual([]);
    expect(
      extractTasks(
        JSON.stringify({ type: 'doc', content: [{ type: 'taskList', content: 'nope' }] }),
      ),
    ).toEqual([]);
  });
});

describe('setTaskChecked', () => {
  it('checks the addressed item and leaves every other one alone', () => {
    const updated = setTaskChecked(checklist, 0, true);

    expect(extractTasks(updated)).toEqual([
      { index: 0, text: 'milk', checked: true },
      { index: 1, text: 'eggs', checked: true },
    ]);
  });

  it('unchecks an already-checked item', () => {
    const updated = setTaskChecked(checklist, 1, false);

    expect(extractTasks(updated)[1].checked).toBe(false);
  });

  it('addresses a nested item by the same ordinal `extractTasks` reports', () => {
    const updated = setTaskChecked(JSON.stringify(nestedDoc), 1, false);

    expect(extractTasks(updated)).toEqual([
      { index: 0, text: 'trip', checked: false },
      { index: 1, text: 'passport', checked: false },
      { index: 2, text: 'book flights', checked: false },
    ]);
  });

  it("preserves the rest of the document, including the item's own text and other attrs", () => {
    const updated = JSON.parse(setTaskChecked(checklist, 0, true));

    expect(updated.content[0]).toEqual(checklistDoc.content[0]);
    expect(updated.content[1].content[0]).toEqual({
      ...checklistDoc.content[1].content[0],
      attrs: { checked: true },
    });
  });

  it('returns content unchanged when the ordinal addresses no item', () => {
    // A stale ordinal (the Note changed since it was read) must not
    // silently move a different checkbox — callers resync on this.
    expect(setTaskChecked(checklist, 7, true)).toBe(checklist);
    expect(setTaskChecked(checklist, -1, true)).toBe(checklist);
  });

  it('leaves a plain-text Note as plain text rather than rewriting it as JSON', () => {
    expect(setTaskChecked('milk\neggs', 0, true)).toBe('milk\neggs');
  });
});

describe('collectTasks', () => {
  it('groups each Note with its own items, dropping Notes that have none', () => {
    const groups = collectTasks([
      { id: 1, content: checklist },
      { id: 2, content: 'just prose' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].note.id).toBe(1);
    expect(groups[0].tasks.map((task) => task.text)).toEqual(['milk', 'eggs']);
  });

  it('preserves the caller\'s Note order', () => {
    const groups = collectTasks([
      { id: 2, content: checklist },
      { id: 1, content: checklist },
    ]);

    expect(groups.map((group) => group.note.id)).toEqual([2, 1]);
  });

  it('puts open items above completed ones, each still in document order', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'done first' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'open first' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'open second' }] }] },
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'done second' }] }] },
          ],
        },
      ],
    };

    const [group] = collectTasks([{ id: 1, content: JSON.stringify(doc) }]);

    expect(group.tasks.map((task) => task.text)).toEqual([
      'open first',
      'open second',
      'done first',
      'done second',
    ]);
    // Display order is not document order — the ordinals each row carries
    // are what `setTaskChecked` addresses, so they must survive the sort.
    expect(group.tasks.map((task) => task.index)).toEqual([1, 2, 0, 3]);
  });

  it('carries every other field on the note through untouched', () => {
    // The screen composes this over `withFolderContext` (ticket 06), so
    // the folder name attached there has to survive grouping.
    const [group] = collectTasks([{ id: 1, content: checklist, folderName: 'Work' }]);

    expect(group.note).toMatchObject({ id: 1, folderName: 'Work' });
  });

  it('returns an empty list when no Note holds a checklist', () => {
    expect(collectTasks([{ id: 1, content: 'just prose' }])).toEqual([]);
  });
});
