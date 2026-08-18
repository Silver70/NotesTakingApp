# 04 — Rich-text formatting via TenTap (WYSIWYG)

**What to build:** Replace the plain text input from ticket 03 with `@10play/tentap-editor`, and add a formatting toolbar covering every mark in the spec's Extended tier: multiple heading levels, bold, italic, underline, bulleted list, numbered list, and checklist/checkbox. Formatting applies and renders immediately (WYSIWYG) — no markdown syntax is ever typed or shown. Content continues to persist through the same repository content field from ticket 02/03; the derived-title logic (first line of content) continues to work against the richer document format.

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] Note editor uses TenTap instead of a plain text input
- [ ] Toolbar (or equivalent UI) applies: heading (multiple levels), bold, italic, underline, bulleted list, numbered list, checklist/checkbox
- [ ] Applying a mark shows its effect immediately in the editor — no markdown syntax appears anywhere
- [ ] Checklist items can be checked/unchecked directly in the editor
- [ ] Formatted content round-trips correctly through autosave: closing and reopening a Note preserves all applied formatting
- [ ] Derived title (first line) still resolves sensibly against rich content (e.g. a heading as the first line becomes the title)
