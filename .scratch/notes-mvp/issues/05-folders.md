# 05 — Folders: create, rename, delete, assign, and browse

**What to build:** Folder management UI: create a Folder (name only, shown with a fixed default folder icon — no color/icon customization), rename a Folder, delete a Folder, and browse into a Folder to see the Notes filed there. A Note created while inside a Folder defaults into that Folder; a Note created from "All Notes" starts Unfiled. An existing Note can be moved to a different Folder or back to Unfiled. Deleting a Folder moves its Notes to Unfiled rather than deleting them (this behavior already exists at the repository layer from ticket 02 — this ticket surfaces it through the UI and verifies it end-to-end).

**Blocked by:** 02, 03

**Status:** done

- [x] User can create a Folder with a name; it displays with the default folder icon
- [x] User can rename an existing Folder
- [x] User can delete a Folder; its Notes remain intact and become Unfiled, visible from "All Notes"
- [x] Browsing into a Folder shows only the Notes assigned to it
- [x] "+ New Note" from inside a Folder creates the Note already assigned to that Folder
- [x] "+ New Note" from "All Notes" creates an Unfiled Note
- [x] An existing Note can be moved to a different Folder, or back to Unfiled, from the note view
- [x] "All Notes" continues to show every Note regardless of Folder assignment

## Comments

Implemented across `app/index.tsx`, `app/notes.tsx`, `app/folder/[id].tsx`, `app/note/[id].tsx`, plus new shared UI pieces, commit `aa950a9`.

- The repository layer (create/rename/delete/list Folder, move Note, folder-scoped `listNotes`) already existed and was already tested from ticket 02 — this ticket was UI-only, matching the spec's "UI/component-level tests are out of scope" testing decision. No new tests were added; the existing 61-test suite, `tsc --noEmit`, and `eslint` all stayed clean.
- Navigation reshuffle: `app/index.tsx` is now the Folders/home screen (Apple Notes-style — "All Notes" pinned above every Folder). The previous "All Notes" screen content moved to `app/notes.tsx`. `app/folder/[id].tsx` is new: browses one Folder's Notes, with "+ New Note" defaulting into that Folder, and rename/delete surfaced in its own header (not just from the Folders list).
- Folder name entry (create + rename) goes through a new `components/text-prompt-modal.tsx` rather than `Alert.prompt`, which is iOS-only — this app targets iOS and Android from initial release per spec.md.
- Moving an existing Note goes through a new `components/folder-picker-modal.tsx` (a scrollable "Unfiled" + Folders list), reachable from a header button on the Note screen that shows the Note's current Folder name. Only shown for an already-persisted Note — a new Note's Folder is fixed at creation from the `folderId` route param.
- Rename/delete confirmation logic for a Folder was identical between the Folders list and the Folder browse view, so it's shared via `hooks/use-folder-actions.ts` rather than duplicated.
- Hardening found via `/code-review` before committing: (1) creating a Note whose target Folder no longer exists (a stale `folderId` route param, or the Folder deleted from another screen mid-edit) now falls back to Unfiled instead of the autosave silently and permanently failing; (2) `app/folder/[id].tsx`'s "not found" state is no longer a one-way ratchet and now guards against a stale (out-of-order) load response clobbering a fresher one, matching the pattern `app/note/[id].tsx` already used.
