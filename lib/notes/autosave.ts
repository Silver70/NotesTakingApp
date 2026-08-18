/**
 * Pure decision logic for the Note editor's autosave/discard behavior
 * (ticket 03). Kept free of React and the repository so the "when do we
 * create vs. update vs. delete vs. do nothing" rules are testable without
 * rendering a screen — the screen is a thin consumer that executes
 * whichever action these functions return.
 *
 * A Note being edited is either brand new (`noteId: null`, nothing in the
 * repository yet) or already persisted (`noteId` set). See CONTEXT.md
 * ("Resolved behaviors"): a Note with no content is discarded silently if
 * the user navigates away without ever giving it content.
 */
export type NoteDraftState = { noteId: number | null };

export type AutosaveAction =
  | { type: "create"; content: string }
  | { type: "update"; noteId: number; content: string }
  | { type: "none" };

/**
 * What to do, mid-edit, after `content` changes. Blank content is never
 * written to the repository — a Note only starts existing once it has
 * real content, at which point further edits update it in place.
 */
export function decideAutosave(
  state: NoteDraftState,
  content: string,
): AutosaveAction {
  if (content.trim().length === 0) {
    return { type: "none" };
  }
  return state.noteId === null
    ? { type: "create", content }
    : { type: "update", noteId: state.noteId, content };
}

export type LeaveAction =
  | { type: "create"; content: string }
  | { type: "update"; noteId: number; content: string }
  | { type: "delete"; noteId: number }
  | { type: "none" };

/**
 * What to do when the user navigates away from the editor. Mirrors
 * `decideAutosave` for the non-empty case (flushing any edit a pending
 * debounce hasn't saved yet), but adds one rule `decideAutosave` doesn't
 * have: a Note left with no content is removed rather than left behind as
 * an empty entry, whether it was never persisted (nothing to do) or was
 * persisted earlier in the session and then typed back down to nothing
 * (deleted).
 */
export function decideOnLeave(
  state: NoteDraftState,
  content: string,
): LeaveAction {
  if (content.trim().length === 0) {
    return state.noteId === null
      ? { type: "none" }
      : { type: "delete", noteId: state.noteId };
  }
  return decideAutosave(state, content);
}
