# 09 — Settings: theme mode, accent color, and editor appearance

**What to build:** A third destination in the bottom nav — a Settings screen — plus the preference layer behind it. Today the app's light/dark theme is entirely OS-driven (`hooks/use-color-scheme.ts` is a bare re-export of React Native's hook) and the terracotta accent is hardcoded in `constants/theme.ts`, so the user has no say in either. This ticket gives them explicit control over theme mode, accent color, and note body text size, persists those choices across launches, and adds a small data section (Note/Folder counts plus a confirm-gated "delete all Notes"). Device-local preferences only — no accounts, no profile, no sync (see Non-goals).

**Blocked by:** None outstanding — 02 (repository + schema) and the ticket-less UI pass this builds on are both done.

**Status:** ready-for-agent

- [ ] The bottom nav pill has a third destination, Settings, alongside Home and Search; `NavSection` grows to match and every screen rendering `BottomNav` passes its own `active` value
- [ ] Settings offers a theme mode choice — System / Light / Dark — that applies immediately across every screen, with no restart or reload
- [ ] Settings offers an accent color choice from a small fixed palette; the chosen accent drives every `tint`-derived surface (the FAB, active toolbar/nav states, selection) in both light and dark
- [ ] Theme mode and accent both persist across an app restart
- [ ] Settings offers a note body text size (at least small / medium / large) that applies in the Note editor
- [ ] Settings shows the current Note count and Folder count
- [ ] Settings offers "Delete all Notes", gated behind the same kind of native confirmation as a single-Note delete; it deletes Notes only — Folders are left in place (deleting a Folder is a separate action that never deletes Notes, per CONTEXT.md)
- [ ] The existing test suite, `tsc --noEmit`, and `eslint` all stay clean

## Implementation notes

- **Where preferences live**: `@react-native-async-storage/async-storage` isn't installed, and SQLite already is — store preferences in a small key/value `settings` table via drizzle (`npm run db:generate` for the migration), consistent with ADR-0001. Put it behind its own seam (`createSettingsRepository`) rather than growing `NotesRepository`: preferences aren't Notes or Folders, and a separate seam keeps it testable against real SQLite the same way `db/__tests__/repository.test.ts` is.
- **Load timing**: `DatabaseProvider` resolves asynchronously, so the theme needs a defined value before preferences finish loading. Start from System + the current terracotta accent and swap once loaded, and check there's no visible flash of the wrong theme on launch.
- **The colour-scheme hook**: `hooks/use-color-scheme.ts` and its `.web.ts` twin are what every screen already reads through `useThemeColor`. Route the preference through those, so no screen has to learn about the preference at all.
- **Accent**: `Colors` in `constants/theme.ts` is a static object with `tint` baked in. Prefer building the palette from the chosen accent once, at provider level, over special-casing `tint` inside `useThemeColor` — then anything already reading `tint`/`tabIconSelected` picks it up for free.
- **Navigation theme**: `app/_layout.tsx` picks React Navigation's `DarkTheme`/`DefaultTheme` off the same colour scheme, so it needs the preference too; consider feeding the accent into that theme's `primary`.
- **Editor text size**: the editor's colors are already injected as CSS into the TenTap WebView and re-injected on theme change — see ticket 04's notes on the `onLoad` gating and load-generation counter. Font size goes through that same path, not a React Native style.
- **Decide what the nav pill does**: its dark background is deliberately near-constant across themes (`components/ui/bottom-nav.tsx:16-19`, `constants/theme.ts`'s `navBackground`) so it reads as fixed chrome. A user who explicitly picks Light may well expect it to follow. Either answer is defensible — make it a decision and record it in the comment rather than leaving it accidental.

## Deliberately not in this ticket

- **Sort order**: out of scope per spec.md ("Note pinning, reordering, or sorting options beyond most-recently-edited").

## Non-goals

Accounts, login, user profile, cloud backup, or sync. spec.md's Out of Scope and CONTEXT.md's local-first framing both still hold — this screen is device-local preference only. (Extends `.scratch/notes-mvp/spec.md` past the MVP pass; it does not revise it.)
