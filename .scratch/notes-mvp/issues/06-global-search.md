# 06 — Global live Search across Notes and Folders

**What to build:** A search entry point that filters live as the user types, matching both a Note's derived title and its body content, across every Folder and Unfiled Notes at once. Each result shows which Folder it belongs to (or that it's Unfiled) for context.

**Blocked by:** 02, 05

**Status:** done

- [x] Search results update live as the user types, with no separate "search" action to press
- [x] A query matches against both a Note's derived title and its body content
- [x] Results span every Folder and Unfiled Notes — search is never scoped to only the currently open Folder
- [x] Each result shows which Folder it's in (or "Unfiled" if it has none)
- [x] Tapping a result opens that Note directly

## Comments

Implemented via a new `app/search.tsx` screen, reached from a magnifying-glass button in the Folders screen's (`app/index.tsx`) header — the main nav hub, Apple Notes-style.

- The repository's `searchNotes` (matching title + body, spanning every Folder/Unfiled, case-insensitive) already existed and was already tested from an earlier ticket — see its `describe('search', ...)` block in `db/__tests__/repository.test.ts`. This ticket's own work was the UI layer plus one new pure seam: `lib/notes/search.ts`'s `withFolderContext`, which attaches each result's Folder name (or `null` for Unfiled) without growing the repository's return shape — unit-tested in `lib/notes/__tests__/search.test.ts` (TDD: written and red before `search.ts` existed).
- `components/search-results-list.tsx` is a new component rather than a `NotesList` variant — every result can come from a different Folder, so each row needs a second line naming it (or "Unfiled"), and search never offers the delete affordance `NotesList` has.
- Typing is debounced (200ms, same idea as the editor's autosave debounce) before re-querying, and Folder names are refreshed once per screen focus rather than refetched on every keystroke — both found and fixed via `/code-review` before committing.
- Also found and fixed via `/code-review`: results didn't refresh when the screen regained focus (e.g. after editing or deleting a tapped-into Note from the results and navigating back), unlike every other list screen's `useFocusEffect`-based reload — `search.tsx` now re-runs the current query on focus, same reasoning as `app/notes.tsx`/`app/folder/[id].tsx`. A failed search also used to leave the previous query's (now-mismatched) results on screen silently; it now clears them.
