# 05 — Folders: create, rename, delete, assign, and browse

**What to build:** Folder management UI: create a Folder (name only, shown with a fixed default folder icon — no color/icon customization), rename a Folder, delete a Folder, and browse into a Folder to see the Notes filed there. A Note created while inside a Folder defaults into that Folder; a Note created from "All Notes" starts Unfiled. An existing Note can be moved to a different Folder or back to Unfiled. Deleting a Folder moves its Notes to Unfiled rather than deleting them (this behavior already exists at the repository layer from ticket 02 — this ticket surfaces it through the UI and verifies it end-to-end).

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] User can create a Folder with a name; it displays with the default folder icon
- [ ] User can rename an existing Folder
- [ ] User can delete a Folder; its Notes remain intact and become Unfiled, visible from "All Notes"
- [ ] Browsing into a Folder shows only the Notes assigned to it
- [ ] "+ New Note" from inside a Folder creates the Note already assigned to that Folder
- [ ] "+ New Note" from "All Notes" creates an Unfiled Note
- [ ] An existing Note can be moved to a different Folder, or back to Unfiled, from the note view
- [ ] "All Notes" continues to show every Note regardless of Folder assignment
