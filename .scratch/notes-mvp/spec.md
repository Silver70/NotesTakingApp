# Notes MVP: Rich-Text Notes with Voice Dictation, Folders, and Search

Status: ready-for-agent

> **Descoped 2026-08-19 — Voice dictation is removed from this app.** Everything below
> about Dictation / speech recognition (user stories 17–23, the "Voice dictation
> engine" decision, the Dictation engine adapter seam, and tickets 07 and 08) is
> kept as the historical record of what was built, not as current scope. The
> `expo-speech-recognition` dependency, its config plugin, `lib/dictation/`, and the
> editor's mic control have all been deleted — see tickets 07 and 08.

## Problem Statement

The user wants a fast, distraction-free place on their phone to capture and organize thoughts: jot something down the moment it occurs to them, format it enough to stay readable, group related notes together, find any of them again later, and — when typing isn't convenient — just speak and have it written down for them. They don't want to manage an account, wait on a network connection, or think about syncing; they just want a notes app that works.

## Solution

A local-only, cross-platform (iOS + Android) notes app. Users create, edit, and permanently delete rich-text Notes; format them with headings, bold, italic, underline, and bulleted/numbered/checklist lists via a WYSIWYG toolbar (no markdown syntax); organize them into flat Folders (or leave them Unfiled); find any note instantly via global live Search; and dictate directly into a note using on-device speech recognition that writes recognized text at the cursor in real time as they speak.

## User Stories

**Note lifecycle**

1. As a user, I want to create a new blank Note with one tap, so that I can start capturing a thought immediately.
2. As a user, I want my Note to save automatically as I type or dictate, so that I never have to remember to hit save.
3. As a user, I want to edit any Note I've previously created, so that I can update my thoughts later.
4. As a user, I want to permanently delete a Note I no longer need, so that my notes list stays relevant.
5. As a user, I want to be asked to confirm before a Note is permanently deleted, so that I don't lose content to an accidental tap.
6. As a user, I want a Note I create but never type anything into to disappear automatically when I navigate away, so that my notes list isn't cluttered with blank entries.
7. As a user, I want each Note in my list to show a meaningful title derived from what I wrote, so that I don't have to name every note manually.

**Formatting**

8. As a user, I want to mark text as a heading, so that I can structure a Note visually.
9. As a user, I want multiple heading levels, so that I can create sub-sections within a Note.
10. As a user, I want to make text bold, so that I can emphasize key points.
11. As a user, I want to italicize text, so that I can add subtle emphasis.
12. As a user, I want to underline text, so that I have another way to highlight important content.
13. As a user, I want to create bulleted lists, so that I can capture unordered items.
14. As a user, I want to create numbered lists, so that I can capture sequential/ordered items.
15. As a user, I want to add checklist items with checkboxes, so that I can track simple to-dos inside a Note.
16. As a user, I want formatting to apply and display immediately (WYSIWYG), so that I never have to read or type markdown syntax.

**Voice dictation**

17. As a user, I want to enable dictation with a single tap, so that I can speak instead of type.
18. As a user, I want my speech converted to text and written into the Note live as I speak, so that I don't have to wait until I finish talking to see it appear.
19. As a user, I want dictated text to insert wherever my cursor currently is, so that I can dictate additions into the middle of an existing Note, not just at the end.
20. As a user, I want Dictation to work with no internet connection, so that I can capture thoughts anywhere.
21. As a user, I want only the transcribed text kept — never the raw audio — so that the app doesn't need to store or manage voice recordings.
22. As a user, I want manual typing disabled while Dictation is actively listening, so that my typed input and streaming speech results never collide in the same spot.
23. As a user, I want to stop Dictation with a tap and resume typing normally, so that I can move fluidly between voice and keyboard.

**Folders**

24. As a user, I want to create a Folder with a name, so that I can group related Notes together.
25. As a user, I want every Folder to show a default folder icon, so that folders are visually distinguishable from notes without me having to customize anything.
26. As a user, I want to assign a Note to a Folder, so that I can keep my notes organized by topic.
27. As a user, I want a Note created while I'm inside a Folder to land in that Folder automatically, so that I don't have to manually file it.
28. As a user, I want a Note created from "All Notes" to start Unfiled, so that I'm not forced to pick a Folder before I can start writing.
29. As a user, I want to move an existing Note to a different Folder (or back to Unfiled), so that I can reorganize as my needs change.
30. As a user, I want to rename a Folder, so that I can correct or update how I've organized my notes.
31. As a user, I want to delete a Folder without losing the Notes inside it, so that tidying my folder structure never costs me content.
32. As a user, I want a Folder's Notes moved to Unfiled automatically when I delete that Folder, so that I can still find them afterward.
33. As a user, I want to view "All Notes" across every Folder in one place, so that I can see everything at a glance regardless of organization.

**Search**

34. As a user, I want to search across all my Notes by typing a query, so that I can quickly find something I wrote previously.
35. As a user, I want Search results to update live as I type, so that I get instant feedback without pressing a search button.
36. As a user, I want Search to match both a Note's title and its body content, so that I can find a Note even if the relevant text isn't in the first line.
37. As a user, I want Search to span every Folder and Unfiled Notes at once, so that I don't have to know where a Note lives to find it.
38. As a user, I want each Search result to show which Folder it belongs to, so that I have context on where the Note lives.

## Implementation Decisions

- **Platform**: React Native via Expo SDK 54, targeting iOS and Android from initial release. Requires a custom Expo Dev Client (`expo prebuild` / `expo run` / EAS Build) rather than Expo Go, since both the rich-text editor and speech recognition depend on native modules.
- **Persistence**: local-only SQLite via `expo-sqlite`, accessed through `drizzle-orm`'s Expo SQLite driver for schema, type-safe queries, and migrations. No backend, no accounts, no sync in this spec — see ADR-0001.
- **Rich text editor**: `@10play/tentap-editor` (Tiptap-based) provides the WYSIWYG surface and produces the persisted document format for a Note's content — see ADR-0002. Supported formatting marks: headings (multiple levels), bold, italic, underline, bulleted list, numbered list, checklist/checkbox.
- **Voice dictation engine**: `expo-speech-recognition`, configured for on-device recognition (`requiresOnDeviceRecognition`) with `interimResults: true` for live partial results as the user speaks. No audio file is ever persisted — only the resulting recognized text.
- **Data model**:
  - **Note**: id, content (the rich-text document produced by the editor), folderId (nullable — null means Unfiled), createdAt, updatedAt. No separate title field; any title shown in the UI is derived from the first line of content.
  - **Folder**: id, name, createdAt. Flat — no parent/child relationship, no color/icon field (the folder icon is a single fixed default rendered by the UI, not stored per-folder).
  - Deleting a Note removes its row immediately (hard delete) — no soft-delete/`isDeleted` field, no trash table. See ADR-0003.
  - Deleting a Folder removes its row and sets `folderId` to null on every Note that referenced it — Notes are never cascade-deleted when their Folder is deleted.
- **Seams** (confirmed with the user):
  - **Notes repository** — the single interface screens call for all Note/Folder persistence and querying: create note, update note content, delete note, list notes (optionally scoped to a Folder or Unfiled), create/rename/delete folder, move note to folder, search notes. This is the primary seam; most behavior in this spec should be exercised through it.
  - **Dictation engine adapter** — a thin wrapper interface around `expo-speech-recognition` exposing start/stop and onPartialResult/onFinalResult callbacks, so cursor-insertion behavior can be tested by feeding synthetic transcript events rather than driving the real microphone/native module.
- **Editor/dictation interaction**: while Dictation is actively listening, the editor's manual text input is disabled; recognized text (both partial and final) inserts at the current cursor position rather than appending to the end of the Note.
- **Empty-note handling**: a newly created Note with no content must never be persisted if the user navigates away before adding any — no empty row should ever appear in a Note list. The externally observable contract is "no empty Note is ever listed"; whether that's implemented by deferring the first write or by writing-then-cleaning-up on exit is left to whoever picks this up.
- **Delete confirmation**: deleting a Note triggers a native confirmation prompt ("this can't be undone") before the repository's delete operation runs. The repository itself has no notion of "pending" deletion — confirmation is a UI-layer concern in front of an unconditional delete call.
- **Search**: a query against the Notes repository matching both derived title and body content, across every Note regardless of `folderId`, updating live as the user types (debounced as needed — exact interval left to implementation).

## Testing Decisions

- Tests should exercise behavior through the two seams (Notes repository, Dictation engine adapter), not through UI components, and not by mocking SQLite or the speech-recognition native module directly. Assert on what the repository persists/returns and what the dictation adapter emits — never on implementation details like SQL statements issued or TenTap's internal editor state.
- Notes repository tests should run against a real SQLite database (in-memory or temp-file, via `expo-sqlite`'s test-friendly APIs or an equivalent driver usable outside the app runtime) rather than a mocked repository — this is a persistence-boundary seam, and real persistence is what catches actual schema/query bugs.
- Dictation adapter tests should feed synthetic partial/final transcript events into the editor-integration logic and assert on the resulting document state (text lands at the cursor; manual typing is rejected while listening). The real `expo-speech-recognition` native module must never run in a test.
- This is a greenfield codebase — there is no existing test suite or prior art to follow. The tests written for this feature establish the pattern later features should follow.
- UI/component-level and end-to-end tests are out of scope for this pass; only the two seams above need coverage here.

## Out of Scope

- User accounts, authentication, or any backend/server component.
- Cloud sync or multi-device access.
- Trash, soft-delete, or Note recovery after deletion.
- Nested/sub-folders.
- Multi-folder membership (tags) for a single Note.
- Folder color/icon customization.
- Saving or attaching raw audio recordings alongside dictated text.
- Cloud-based speech-to-text (this spec is on-device only).
- Bulk actions (multi-select move/delete).
- Note pinning, reordering, or sorting options beyond most-recently-edited.
- Scoped/folder-only Search (this spec is global Search only).
- Android-specific platform polish beyond functional verification — active development iterates on iOS first, with periodic Android passes.
- Any UI/visual design decisions beyond what's implied by the WYSIWYG editor and the default folder icon.

## Further Notes

- This spec covers the full MVP as scoped through the grilling conversation that preceded it: Note CRUD + formatting and Voice Dictation were the original three requested features; Folders and Search were added mid-conversation once the user recalled wanting organization.
- Three ADRs record the higher-stakes decisions behind this spec and should be read alongside it: `docs/adr/0001-expo-sqlite-and-drizzle-for-local-storage.md`, `docs/adr/0002-tentap-for-rich-text-editing.md`, `docs/adr/0003-hard-delete-no-trash.md`.
- The domain glossary in `CONTEXT.md` defines Note, Folder, Unfiled, Dictation, Deletion, and Search precisely — implementers should use those terms, not synonyms (in particular: never "voice recording" for what this spec calls Dictation, since no recording is ever persisted).
- Given the breadth of this MVP (CRUD + formatting + dictation + folders + search, across iOS and Android), whoever picks this up may want to split it into multiple implementation tickets (e.g. one per seam, or one per feature area) rather than treating it as a single monolithic ticket. That decomposition is intentionally left to the picker, not decided here.
