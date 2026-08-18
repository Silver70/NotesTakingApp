# 08 — Voice dictation in the editor

**What to build:** A mic toggle in the note editor that starts and stops the Dictation engine adapter from ticket 07. While actively listening, recognized text (partial and final) inserts at the current cursor position in the TenTap editor in real time, and manual typing is disabled to prevent typed input and streaming speech results from colliding at the same spot. Stopping dictation re-enables manual typing. Only the resulting text is kept — no audio is saved.

**Blocked by:** 04, 07

**Status:** ready-for-agent

- [ ] A mic control in the editor starts and stops Dictation
- [ ] While listening, recognized text appears in the Note live, inserted at the current cursor position — not only appended at the end
- [ ] Manual typing/formatting is disabled while Dictation is actively listening
- [ ] Stopping Dictation re-enables manual typing and formatting immediately
- [ ] Dictated text persists through the same autosave path as typed text — no separate save step
- [ ] No audio file is created, attached, or persisted at any point
- [ ] Works with no network connection (on-device recognition only)
