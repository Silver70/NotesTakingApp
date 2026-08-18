/**
 * A Note's `content` field (see ADR-0001) holds a serialized ProseMirror
 * document once it's been through TenTap (ticket 04) — but ticket 03's
 * plain-text notes, and every existing repository/autosave test, still
 * write raw plain text with literal newlines into that same field. Both
 * `deriveTitle` (db/repository.ts) and the blank/empty checks
 * (lib/notes/autosave.ts) need "the Note's visible text, one line per
 * block" from either shape, so this is the one place that reconciles
 * them — kept free of React and the repository, same as autosave.ts.
 *
 * Ticket 08 (voice dictation) adds a second reason to live here:
 * `insertTextAtPosition`/`replaceTextRange` splice text into a document at
 * a ProseMirror flat position, the same tree shape `docToPlainText` already
 * walks — keeping both kinds of tree-walking in one file avoids a second
 * module re-deriving what "a line-break type" or "a container node" means.
 */

export type ProseMirrorNode = {
  type?: string;
  text?: string;
  content?: ProseMirrorNode[];
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type ProseMirrorDoc = {
  type: 'doc';
  content?: ProseMirrorNode[];
};

// Every block-level node TenTap's StarterKit produces, plus the inline
// hard break (Shift+Enter) — each one ends a "line" in the plain-text
// projection below.
const LINE_BREAK_TYPES = new Set([
  'paragraph',
  'heading',
  'listItem',
  'taskItem',
  'blockquote',
  'hardBreak',
]);

function isProseMirrorDoc(value: unknown): value is ProseMirrorDoc {
  return (
    typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'doc'
  );
}

/** Parses `content` as a ProseMirror document if it is one; `null` for
 * anything else (empty, not JSON, or JSON that isn't a doc) — the one
 * place `toPlainText` and `toEditorContent` share that check. */
function parseDoc(content: string): ProseMirrorDoc | null {
  if (!content) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(content);
    return isProseMirrorDoc(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Wraps ticket 03's plain text (literal `\n`-separated lines) as a
 * ProseMirror document, one paragraph per line — the same "one line per
 * block" shape `docToPlainText` reads back out. Handing TenTap a raw
 * string instead would have it parsed as HTML, where `\n` is
 * insignificant whitespace, collapsing every line onto one. */
function plainTextToDoc(text: string): ProseMirrorDoc {
  return {
    type: 'doc',
    content: text.split('\n').map((line) => ({
      type: 'paragraph',
      content: line.length > 0 ? [{ type: 'text', text: line }] : undefined,
    })),
  };
}

function docToPlainText(doc: ProseMirrorDoc): string {
  const lines: string[] = [''];
  // A list item (or task item) wraps its own paragraph, and both are
  // line-break types — closing the inner paragraph and then the outer
  // item would each end the line, doubling up, if both pushed
  // unconditionally. `visit` returns whether the line is already ended as
  // of its *last* child (not whether any child ever ended one — a hard
  // break followed by more text in the same paragraph must still end that
  // paragraph's line), so a wrapper only skips its own push when nothing
  // since the last break needs flushing. A block with no line-break-type
  // children (an ordinary paragraph, including a genuinely empty one)
  // always ends its own line, so deliberate blank lines are preserved.
  const visit = (node: ProseMirrorNode): boolean => {
    if (node.type === 'text' && node.text) {
      lines[lines.length - 1] += node.text;
    }
    let lineAlreadyEnded = false;
    // `Array.isArray`, not just a truthiness/optional-chaining check: only
    // `type === 'doc'` is validated on the way in (see `isProseMirrorDoc`),
    // not the shape of every nested `content` field, so a malformed row
    // (a bad migration, a hand-edited DB, a future writer's bug) with
    // e.g. a non-array `content` must degrade to "no visible text here"
    // rather than throw out of `deriveTitle`/`searchNotes` and take the
    // whole notes list down with it.
    if (Array.isArray(node.content)) {
      node.content.forEach((child) => {
        lineAlreadyEnded = visit(child);
      });
    }
    if (node.type && LINE_BREAK_TYPES.has(node.type) && !lineAlreadyEnded) {
      lines.push('');
      return true;
    }
    return lineAlreadyEnded;
  };
  if (Array.isArray(doc.content)) {
    doc.content.forEach(visit);
  }
  return lines.join('\n');
}

/**
 * Renders a Note's stored `content` as plain text, one line per block.
 * Content from TenTap (ticket 04+) is a serialized ProseMirror document
 * (`{"type":"doc",...}`) and is walked block-by-block; content that isn't
 * — empty, or ticket 03's plain text — is returned unchanged, since it's
 * already in this shape.
 */
export function toPlainText(content: string): string {
  const doc = parseDoc(content);
  return doc ? docToPlainText(doc) : content;
}

/** The first non-blank line of a `toPlainText` projection, trimmed — what
 * `deriveTitle` (db/repository.ts) shows as a Note's title. Exported
 * separately so callers that already have the plain text (e.g.
 * `searchNotes`, matching both title and body) don't pay for computing it
 * twice. */
export function firstNonBlankLine(plainText: string): string {
  const line = plainText.split('\n').find((candidate) => candidate.trim().length > 0);
  return line?.trim() ?? '';
}

/**
 * Turns a Note's stored `content` into the value TenTap's
 * `useEditorBridge({ initialContent })` expects: the parsed document when
 * `content` already is one, `undefined` for a brand new, still-empty Note
 * (so TenTap falls back to its own empty document instead of being handed
 * `''`), or — for ticket 03's plain text — that text wrapped into a
 * document via `plainTextToDoc`, never handed to TenTap as a raw string
 * (see its docstring for why that would silently lose line breaks).
 */
export function toEditorContent(content: string): ProseMirrorDoc | undefined {
  if (!content) {
    return undefined;
  }
  return parseDoc(content) ?? plainTextToDoc(content);
}

/** What a brand new, still-empty TenTap document round-trips as — a single
 * content-less paragraph. Matches `toPlainText`'s notion of "one blank
 * line" (see the "empty doc" tests in `rich-text.test.ts`). */
export const EMPTY_DOC: ProseMirrorDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Like `toEditorContent`, but never `undefined` — for callers (Dictation,
 * ticket 08) that need a concrete document to splice text into rather than
 * "let TenTap default it". */
export function toDoc(content: string): ProseMirrorDoc {
  return toEditorContent(content) ?? EMPTY_DOC;
}

// Node types with no `content` array of their own at all, ever — every
// other type (including a container that merely *happens* to be empty
// right now, e.g. `{type:'paragraph'}` with no `content` key) is treated
// as a container for sizing purposes, matching real ProseMirror: a node
// with children counts an "open" and "close" token toward its size even
// when, at this moment, it has none.
const LEAF_TYPES = new Set(['text', 'hardBreak']);

// The only node types in this app's document model whose `content` holds
// *inline* nodes (text, hardBreak) rather than more block nodes. Distinct
// from `LINE_BREAK_TYPES` above (which includes wrapper types like
// `listItem` that hold a block, not text, directly): `insertTextIntoNodes`
// needs to know, at each level, whether a bare `{type:'text'}` is a valid
// child *right here* — real ProseMirror's `doc`/`bulletList`/`listItem`/etc.
// never take inline content directly, only paragraph/heading do.
const INLINE_CONTAINER_TYPES = new Set(['paragraph', 'heading']);

/** A node's footprint in ProseMirror's flat position space: a text node's
 * length, 1 for an atomic leaf (`hardBreak`), or 2 (open + close token)
 * plus its children's sizes for everything else. Mirrors
 * `Node#nodeSize` — see https://prosemirror.net/docs/ref/#model.Node.nodeSize. */
function nodeSize(node: ProseMirrorNode): number {
  if (node.type === 'text') {
    return node.text?.length ?? 0;
  }
  if (node.type && LEAF_TYPES.has(node.type)) {
    return 1;
  }
  const content = Array.isArray(node.content) ? node.content : [];
  return 2 + content.reduce((sum, child) => sum + nodeSize(child), 0);
}

function docSize(doc: ProseMirrorDoc): number {
  const content = Array.isArray(doc.content) ? doc.content : [];
  return content.reduce((sum, child) => sum + nodeSize(child), 0);
}

/** Inserts `text` as a new node among `nodes` (siblings starting at flat
 * position `base`), at flat position `pos`. `inline` says whether a bare
 * `{type:'text'}` may legally live directly among `nodes` — true only when
 * recursing through a paragraph/heading's own content, matching real
 * ProseMirror's schema (a `doc`/`bulletList`/`listItem`/etc. never holds
 * inline content directly).
 *
 * Walks the same sibling list `docToPlainText` walks, but front-to-back
 * rather than depth-first-only: a text node spanning or bordering `pos`
 * absorbs the insertion (splitting or extending it — whichever sibling is
 * checked first at a shared boundary "wins", which is always the earlier,
 * i.e. preceding, run, so dictated text naturally extends whatever's just
 * before the cursor); a container node straddling `pos` is recursed into;
 * an empty (or `hardBreak`-adjacent) spot inside a paragraph/heading gets a
 * brand new text node.
 *
 * `pos` can also land in a *block*-level gap — the boundary between two
 * paragraphs, or the very start/end of the document — where a bare text
 * node would never be valid ProseMirror content. A real editor never
 * reports such a position for a live cursor (`TextSelection` always
 * resolves into a textblock — see `TextSelection.near`), so this only
 * happens here via drift/staleness this module defends against elsewhere
 * (e.g. `insertTextAtPosition`'s clamp). When it does, retry with `pos`
 * nudged onto the nearest reachable child — forward by default, falling
 * back to the last child only once nothing follows — mirroring
 * `TextSelection.near`'s own bias. */
function insertTextIntoNodes(
  nodes: ProseMirrorNode[],
  base: number,
  pos: number,
  text: string,
  inline: boolean,
): ProseMirrorNode[] {
  const result: ProseMirrorNode[] = [];
  let cursor = base;
  let inserted = false;

  for (const node of nodes) {
    const size = nodeSize(node);
    const nodeStart = cursor;
    const nodeEnd = cursor + size;
    const isLeaf = LEAF_TYPES.has(node.type ?? '');

    if (!inserted && node.type === 'text' && pos >= nodeStart && pos <= nodeEnd) {
      const nodeText = node.text ?? '';
      const offset = pos - nodeStart;
      result.push({ ...node, text: nodeText.slice(0, offset) + text + nodeText.slice(offset) });
      inserted = true;
      cursor = nodeEnd;
      continue;
    }

    if (!inserted && !isLeaf && pos > nodeStart && pos < nodeEnd) {
      const innerContent = Array.isArray(node.content) ? node.content : [];
      const childInline = INLINE_CONTAINER_TYPES.has(node.type ?? '');
      const newContent = insertTextIntoNodes(innerContent, nodeStart + 1, pos, text, childInline);
      result.push({ ...node, content: newContent });
      inserted = true;
      cursor = nodeEnd;
      continue;
    }

    if (!inserted && inline && pos === nodeStart) {
      // Nothing text-shaped starts or ends exactly here (a bordering text
      // node above would already have claimed this position) — land a
      // fresh text node right before this sibling. Only valid inline,
      // where a bare text node is legal content at all.
      result.push({ type: 'text', text });
      inserted = true;
    }

    result.push(node);
    cursor = nodeEnd;
  }

  if (!inserted) {
    if (inline) {
      // `pos` is at (or past) the end of this whole level — e.g. right
      // after a trailing `hardBreak`, or an empty paragraph with no
      // children at all. Append as a final text node.
      result.push({ type: 'text', text });
    } else if (nodes.length > 0) {
      const nudged = pos <= base ? base + 1 : cursor - 1;
      return insertTextIntoNodes(nodes, base, nudged, text, inline);
    }
    // else: `nodes` is empty and this level isn't inline (e.g. a
    // pathologically content-less list) — nothing valid to redirect into.
    // Drop the insertion rather than produce schema-invalid content.
  }

  return result;
}

/** Removes the flat position range `[from, to)` from `nodes` (siblings
 * starting at `base`) — the deletion counterpart to `insertTextIntoNodes`,
 * used by `replaceTextRange` to clear out a previous partial result before
 * writing the next one. A node entirely inside the range is dropped; a
 * text node partially inside has just its overlap cut out (dropped
 * entirely if that empties it, since ProseMirror never represents a text
 * node with `text: ''`); a container node partially inside is recursed
 * into. */
function deleteRangeFromNodes(
  nodes: ProseMirrorNode[],
  base: number,
  from: number,
  to: number,
): ProseMirrorNode[] {
  if (from >= to) {
    return nodes;
  }
  const result: ProseMirrorNode[] = [];
  let cursor = base;

  for (const node of nodes) {
    const size = nodeSize(node);
    const nodeStart = cursor;
    const nodeEnd = cursor + size;

    if (nodeEnd <= from || nodeStart >= to) {
      result.push(node);
    } else if (nodeStart >= from && nodeEnd <= to) {
      // Entirely within the deleted range — drop it.
    } else if (node.type === 'text') {
      const text = node.text ?? '';
      const cutStart = Math.max(0, from - nodeStart);
      const cutEnd = Math.min(text.length, to - nodeStart);
      const newText = text.slice(0, cutStart) + text.slice(cutEnd);
      if (newText.length > 0) {
        result.push({ ...node, text: newText });
      }
    } else if (!LEAF_TYPES.has(node.type ?? '')) {
      const innerContent = Array.isArray(node.content) ? node.content : [];
      const childFrom = Math.max(from, nodeStart + 1);
      const childTo = Math.min(to, nodeEnd - 1);
      const newContent = deleteRangeFromNodes(innerContent, nodeStart + 1, childFrom, childTo);
      result.push({ ...node, content: newContent });
    } else {
      // An atomic leaf (e.g. hardBreak) can only ever be fully inside or
      // fully outside the range (it has no interior positions to
      // partially overlap) — the branches above already cover both, so
      // this is unreachable in practice. Kept only as a defensive
      // fallback so a future leaf type degrades to "untouched" rather
      // than being silently dropped.
      result.push(node);
    }
    cursor = nodeEnd;
  }

  return result;
}

/** Inserts `text` into `doc` at flat ProseMirror position `pos`, clamped
 * to the document's actual size so a stale/racing position degrades to
 * "insert at the nearest valid edge" rather than producing an out-of-range
 * document. */
export function insertTextAtPosition(doc: ProseMirrorDoc, pos: number, text: string): ProseMirrorDoc {
  const content = Array.isArray(doc.content) ? doc.content : [];
  const clamped = Math.max(0, Math.min(pos, docSize(doc)));
  // `false`: a doc's own top-level children are always blocks, never bare
  // inline content.
  return { ...doc, content: insertTextIntoNodes(content, 0, clamped, text, false) };
}

/** Replaces the flat position range `[from, to)` in `doc` with `text` —
 * Dictation's (ticket 08) core primitive: clearing out a previous partial
 * result and writing the next one (or the settled final one) in its
 * place, in one document. Both bounds are independently clamped to the
 * document's size. */
export function replaceTextRange(
  doc: ProseMirrorDoc,
  from: number,
  to: number,
  text: string,
): ProseMirrorDoc {
  const size = docSize(doc);
  const clampedFrom = Math.max(0, Math.min(from, size));
  const clampedTo = Math.max(clampedFrom, Math.min(to, size));
  const content = Array.isArray(doc.content) ? doc.content : [];
  const withoutRange = deleteRangeFromNodes(content, 0, clampedFrom, clampedTo);
  return insertTextAtPosition({ ...doc, content: withoutRange }, clampedFrom, text);
}
