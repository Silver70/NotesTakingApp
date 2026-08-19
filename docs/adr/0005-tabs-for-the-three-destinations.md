---
status: accepted
---

# Make Home, Tasks, and Settings real tabs, with the existing pill as a custom tab bar

The app's three destinations lived on one flat Stack, and each screen rendered the bottom nav itself and `router.push`ed the chosen route. That treated three peers as a history: Home → Tasks → Settings left three screens on the stack, the back gesture retraced every switch rather than leaving the app, and each visit re-mounted its screen and lost its scroll position. Tapping the destination already shown was special-cased to do nothing, which papered over the symptom for one case out of nine.

We considered keeping the flat Stack and switching `push` to `replace`. Rejected: it fixes the stack growth but not the state loss, and it makes the back gesture meaningless rather than correct.

We chose expo-router's `Tabs` with `tabBar` pointing at the existing floating pill, so the navigation model changes without the design changing at all. Folder-browse and Search moved into a Stack nested under the Home tab (`app/(tabs)/(home)/`), which is what they already were conceptually — both "browse out of Home" and both used to pass `active="home"` by hand.

## Consequences

Route URLs are unchanged. `(tabs)` and `(home)` are groups, so `/`, `/folder/[id]`, `/search`, `/tasks`, `/settings`, and `/note/[id]` all still resolve exactly as before.

Screens now stay mounted across tab switches instead of re-mounting. That is only safe because the shared Notes store (ADR-0004) already removed every screen's focus-triggered refetch — under the old per-screen `useState` + `useFocusEffect` model, a screen that stayed mounted would also have stayed stale.

The "new Note" FAB was split out of the nav into `components/ui/add-note-button.tsx` and is rendered per screen. What it does is screen-specific — from a Folder it creates a Note already filed there — and a tab bar shared by every screen underneath has no way to know which Folder is being browsed. The two remain visually one row of chrome by following the same positioning rule (20pt side margins, `insets.bottom + 12`) rather than by sharing a layout.

The Note editor stays outside the tab navigator, pushed from the root Stack. It replaces the bottom chrome entirely with its own back button and formatting toolbar, and is reachable from every tab.

`NavPill` renders from the navigator's own route list rather than a hand-maintained array, so a new destination is one file under `app/(tabs)/` plus one entry in its icon/label map. A route the map doesn't know is skipped, which is how Folder-browse and Search live under the tabs without becoming destinations.
