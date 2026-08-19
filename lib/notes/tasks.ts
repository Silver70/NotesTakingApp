/**
 * The Tasks rollup (ticket 10): every checklist item (`taskItem`) from
 * every Note, gathered into one list. Ticket 04 gave the editor
 * checklists, but a `taskItem` only ever renders inside the Note that
 * holds it — this module is what lets one screen show all of them.
 *
 * Shaped like `withFolderContext` (lib/notes/search.ts, ticket 06): a
 * pure module composed over the repository's existing `listNotes`, not a
 * new repository method. There's no query to push this into — a Note's
 * `content` is opaque to SQL (ADR-0001), so finding checklist items means
 * walking the document either way. Kept free of React and the repository,
 * same as autosave.ts/rich-text.ts, and typed structurally against the
 * slice of `NoteRow` it needs so it stays unit-testable without a
 * database.
 */

import { nodeToPlainText, toDoc, type ProseMirrorNode } from './rich-text';

/** TipTap's checklist item node, and the attribute holding its state —
 * `{ type: 'taskItem', attrs: { checked: boolean } }`, one per checkbox,
 * wrapped in a `taskList`. `taskItem` is already known to rich-text.ts as
 * a line-break type; this is the same node seen from the other side. */
const TASK_ITEM_TYPE = 'taskItem';

/** List containers a `taskItem` can nest *inside itself* (TaskItem's
 * content is `paragraph block*` when nesting is on). Their text belongs
 * to the nested items, not to this item's own label — see `ownText`. */
const NESTED_LIST_TYPES = new Set(['taskList', 'bulletList', 'orderedList']);

export interface TaskItem {
  /** This item's position in its Note's document order, counting every
   * `taskItem` from 0 — the only handle it has, since a `taskItem` node
   * carries no id. `setTaskChecked` addresses items by the same number,
   * derived from the same walk, so the two can't disagree. */
  index: number;
  /** The item's own label, blank lines collapsed onto one line. */
  text: string;
  checked: boolean;
}

function contentOf(node: { content?: ProseMirrorNode[] }): ProseMirrorNode[] {
  // `Array.isArray`, not truthiness: a malformed row must degrade to "no
  // children here" rather than throw, matching rich-text.ts's handling.
  return Array.isArray(node.content) ? node.content : [];
}

/**
 * The single walk that defines what a task item *is* and what ordinal it
 * has. Both `extractTasks` and `setTaskChecked` go through it — reading
 * and writing can't drift apart on numbering if they never number
 * separately. `visit` is called with each `taskItem` and its ordinal and
 * returns the node to keep in its place (itself, for a read-only walk).
 *
 * A node is visited before its own children are walked, so both the
 * ordinals and the order `visit` fires in follow document order even when
 * checklists nest — a parent item comes before the items inside it.
 */
function mapTaskItems(
  nodes: ProseMirrorNode[],
  counter: { next: number },
  visit: (node: ProseMirrorNode, index: number) => ProseMirrorNode,
): ProseMirrorNode[] {
  return nodes.map((node) => {
    const visited = node.type === TASK_ITEM_TYPE ? visit(node, counter.next++) : node;
    return Array.isArray(visited.content)
      ? { ...visited, content: mapTaskItems(visited.content, counter, visit) }
      : visited;
  });
}

/** A task item's own label: its text, minus any checklist nested inside
 * it (those are separate items with their own rows), flattened onto one
 * line since a row shows one line. */
function ownText(node: ProseMirrorNode): string {
  const own = contentOf(node).filter((child) => !NESTED_LIST_TYPES.has(child.type ?? ''));
  return nodeToPlainText({ ...node, content: own })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Every checklist item in a Note's stored `content`, in document order.
 * Content that holds no checklist — a ticket 03 plain-text Note, an empty
 * Note, or a malformed row — yields an empty list rather than throwing.
 */
export function extractTasks(content: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  mapTaskItems(contentOf(toDoc(content)), { next: 0 }, (node, index) => {
    tasks.push({ index, text: ownText(node), checked: node.attrs?.checked === true });
    return node;
  });
  return tasks;
}

/**
 * Returns `content` with the item at `index` checked or unchecked —
 * serialized back to the same JSON shape the editor reads. Every other
 * node, attribute, and the item's own text are left exactly as they were.
 *
 * `content` comes back untouched when `index` addresses no item, which
 * covers both a plain-text Note (no checklist to toggle, and no reason to
 * rewrite it as JSON) and an ordinal that has gone stale because the Note
 * changed since it was read — callers should treat an unchanged return as
 * "re-read and resync", not as success.
 */
export function setTaskChecked(content: string, index: number, checked: boolean): string {
  const doc = toDoc(content);
  let found = false;
  const updated = mapTaskItems(contentOf(doc), { next: 0 }, (node, i) => {
    if (i !== index) {
      return node;
    }
    found = true;
    return { ...node, attrs: { ...node.attrs, checked } };
  });
  return found ? JSON.stringify({ ...doc, content: updated }) : content;
}

interface NoteContent {
  content: string;
}

export interface TaskGroup<T> {
  note: T;
  tasks: TaskItem[];
}

/**
 * Groups every Note's checklist items under the Note they came from,
 * dropping Notes that have none, and preserving the caller's Note order
 * (`listNotes` sorts most-recently-edited first, which is the order the
 * rest of the app already lists Notes in).
 *
 * Within a group, open items come first and completed ones after, each in
 * document order: a Note whose checklist is mostly ticked off shouldn't
 * bury its remaining items. Each item keeps its `index`, so this display
 * order never has to be reconciled with the document order
 * `setTaskChecked` addresses.
 */
export function collectTasks<T extends NoteContent>(notes: T[]): TaskGroup<T>[] {
  const groups: TaskGroup<T>[] = [];
  for (const note of notes) {
    const tasks = extractTasks(note.content);
    if (tasks.length === 0) {
      continue;
    }
    groups.push({
      note,
      tasks: [...tasks.filter((task) => !task.checked), ...tasks.filter((task) => task.checked)],
    });
  }
  return groups;
}
