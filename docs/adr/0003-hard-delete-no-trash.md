---
status: accepted
---

# Notes are hard-deleted; there is no Trash

The default in most note-taking apps (Apple Notes included) is soft delete: move the note to a Trash/Recently Deleted folder, purge it automatically after a window, and let the user recover an accidental deletion. We recommended that default here for the safety net it provides. The product decision was deliberately made against that recommendation: deleting a note removes it immediately and permanently, with only a confirmation alert ("this can't be undone") standing between the tap and the loss. This was chosen to keep the data model and UI simple for the MVP — no `isDeleted`/`deletedAt` state, no trash view, no purge scheduling — accepting the trade-off that an accidental confirm means genuine, unrecoverable data loss.

## Consequences

If a Trash/recovery feature is wanted later, it requires a schema change (soft-delete fields) and a new UI surface — it isn't a drop-in addition to the current delete flow.
