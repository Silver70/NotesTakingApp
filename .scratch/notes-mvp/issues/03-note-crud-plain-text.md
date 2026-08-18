# 03 — Create, edit, delete, and list Notes (plain text)

**What to build:** The "All Notes" list screen (flat, sorted by most-recently-edited), a "+ New Note" action that creates a blank Note and opens it for editing, continuous autosave of edits through the Notes repository, a derived title (first line of content) shown in the list, deleting a Note behind a "this can't be undone" confirmation prompt, and silent discard of a Note that was created but never had any content typed into it before the user navigated away. Uses a plain multiline text input for content at this stage, not rich text — this ticket proves the full CRUD loop end-to-end before formatting is layered on top in the next ticket.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] "All Notes" list shows every Note, sorted by most-recently-edited, each row showing its derived title
- [ ] Tapping "+ New Note" creates a blank Note and opens it for editing
- [ ] Edits autosave continuously via the Notes repository — no explicit save action exists
- [ ] Deleting a Note shows a confirmation prompt; only on confirming does the repository's delete run
- [ ] A Note created but left with no content, when navigated away from, is never persisted and never appears in the list
- [ ] Reopening an existing Note loads its current content and continues to autosave edits
