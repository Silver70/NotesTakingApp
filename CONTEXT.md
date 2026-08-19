# NotesApp

A local-first, cross-platform (iOS + Android) mobile note-taking app. A single user creates, edits, and permanently deletes rich-text **Notes**. No accounts, no server, no sync — all data lives on the device.

## Language

**Note**:
A single rich-text document a user creates, edits, and can permanently delete. Has no separate title field — its title is derived from the first line of its content (Apple Notes-style). Belongs to exactly one Folder, or is unfiled ("All Notes") if never assigned one.
_Avoid_: Document, page, entry

**Folder**:
A flat (non-nestable), user-named container that organizes Notes, shown with a fixed default folder icon (not user-customizable — no colors/icons). A Note belongs to at most one Folder at a time and can be moved between Folders (or to Unfiled) after creation. Deleting a Folder does not delete the Notes inside it — they become unfiled.
_Avoid_: Notebook, tag, label, category (a Folder is not a tag — a Note can't belong to more than one)

**Unfiled**:
The implicit state of a Note that has never been assigned to a Folder. Shown in "All Notes" alongside every other note.
_Avoid_: Inbox, uncategorized

**Deletion**:
Permanently removing a Note. There is no Trash, no recovery window, and no soft-delete state — deletion is immediate and irreversible, gated only by a confirmation prompt at the moment of deletion. Deleting a Folder is a distinct action that never deletes the Notes inside it (see Folder).
_Avoid_: Trash, soft delete, archive

**Search**:
A global, live, filter-as-you-type lookup across every Note's title and body content, regardless of which Folder (or unfiled) each Note belongs to.
_Avoid_: Filter (reserved for folder-scoped narrowing, if that's ever added)

**Formatting mark**:
An inline or block-level style applied to a Note's content: heading (multiple levels), bold, italic, underline, bulleted list, numbered list, checkbox/checklist. Applied via a WYSIWYG toolbar — the user never types markup syntax.
_Avoid_: Markdown, style tag

**Task**:
A single checklist item inside a Note — the checkbox Formatting mark, seen as a thing the user tracks rather than as a style. A Task never exists on its own: it always belongs to exactly one Note, has no due date, reminder, or assignee, and is identified only by its position in that Note's content. The Tasks screen gathers every Task from every Note into one place; ticking one there is the same edit as ticking it in the editor.
_Avoid_: To-do, reminder, checklist (a Checklist is the group; a Task is one item in it)

**Preference**:
A device-local appearance choice the user makes on the Settings screen — theme mode (System / Light / Dark), accent color, and Note text size. A Preference belongs to the device, not to a user: there is no account to attach one to and nothing syncs them. Stored alongside Notes and Folders, but never part of either.
_Avoid_: Profile, config, options (Settings is the screen; a Preference is one value on it)

## Resolved behaviors (not glossary terms, but settled product decisions worth recording)

- A new Note defaults into the Folder it was created from; from "All Notes" it starts Unfiled.
- A Note with no content is discarded silently if the user navigates away without typing anything — it's never persisted as an empty entry.
- Ticking a Task from the Tasks screen counts as editing its Note: it changes the Note's stored content, so it updates that Note's "last edited" time and moves it up the Notes list, exactly as editing it in the editor would.
- "Delete all Notes" (Settings) deletes every Note and leaves every Folder standing — the mirror of deleting a Folder, which deletes no Notes. Neither action is ever a way of performing the other.
- Theme mode, accent color, and Note text size take effect the moment they're chosen and survive a restart. There is no "apply" step and no restart prompt.
- An edit made anywhere is visible everywhere at once. Creating, editing, moving, or deleting a Note updates every screen showing it as it happens — no screen shows a stale copy that only corrects itself when the user navigates back to it (ADR-0004).
- The Tasks screen's order holds still while the user is on it. Ticking an item marks it done without moving it, or its Note, out from under the finger that tapped it; the list re-sorts the next time the screen is opened.
