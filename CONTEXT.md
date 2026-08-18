# NotesApp

A local-first, cross-platform (iOS + Android) mobile note-taking app. A single user creates, edits, and permanently deletes rich-text **Notes**, optionally dictating text live via on-device speech recognition. No accounts, no server, no sync — all data lives on the device.

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

**Dictation**:
Live, on-device speech-to-text: as the user speaks, recognized words are written directly into the Note's content in real time. The raw audio is never persisted — only the resulting text is kept.
_Avoid_: Voice recording, voice memo, transcription (transcription implies a saved audio source; there isn't one here)

**Deletion**:
Permanently removing a Note. There is no Trash, no recovery window, and no soft-delete state — deletion is immediate and irreversible, gated only by a confirmation prompt at the moment of deletion. Deleting a Folder is a distinct action that never deletes the Notes inside it (see Folder).
_Avoid_: Trash, soft delete, archive

**Search**:
A global, live, filter-as-you-type lookup across every Note's title and body content, regardless of which Folder (or unfiled) each Note belongs to.
_Avoid_: Filter (reserved for folder-scoped narrowing, if that's ever added)

**Formatting mark**:
An inline or block-level style applied to a Note's content: heading (multiple levels), bold, italic, underline, bulleted list, numbered list, checkbox/checklist. Applied via a WYSIWYG toolbar — the user never types markup syntax.
_Avoid_: Markdown, style tag

## Resolved behaviors (not glossary terms, but settled product decisions worth recording)

- A new Note defaults into the Folder it was created from; from "All Notes" it starts Unfiled.
- A Note with no content is discarded silently if the user navigates away without typing anything — it's never persisted as an empty entry.
- During Dictation, recognized text inserts at the current cursor position, not just appended at the end. Manual typing is disabled while actively listening.
