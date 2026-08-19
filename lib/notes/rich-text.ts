/**
 * A Note's `content` field (see ADR-0001) holds a serialized ProseMirror
 * document once it's been through TenTap (ticket 04) — but ticket 03's
 * plain-text notes, and every existing repository/autosave test, still
 * write raw plain text with literal newlines into that same field. Both
 * `deriveTitle` (db/repository.ts) and the blank/empty checks
 * (lib/notes/autosave.ts) need "the Note's visible text, one line per
 * block" from either shape, so this is the one place that reconciles
 * them — kept free of React and the repository, same as autosave.ts.
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

/**
 * The visible text of a single node's subtree, projected exactly the way
 * `toPlainText` projects a whole document (one line per block). Exported
 * for the Tasks rollup (ticket 10), which needs one checklist item's own
 * text rather than a whole Note's — routed through `docToPlainText` here
 * rather than re-walked there, so both stay agreed on what a "line" is.
 */
export function nodeToPlainText(node: ProseMirrorNode): string {
  return docToPlainText({ type: 'doc', content: [node] });
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

/** Like `toEditorContent`, but never `undefined` — for callers (the tasks
 * roll-up, ticket 10) that need a concrete document to walk rather than
 * "let TenTap default it". */
export function toDoc(content: string): ProseMirrorDoc {
  return toEditorContent(content) ?? EMPTY_DOC;
}
