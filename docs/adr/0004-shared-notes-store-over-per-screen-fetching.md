---
status: accepted
---

# Hold Notes and Folders in one shared store, not per-screen state refetched on focus

Every list screen used to own a `useState` copy of the Notes it displayed and re-run its query on `useFocusEffect`. That was the only way a screen could hear about a Note created, edited, or discarded in the editor — nothing else told it. The cost was five independent copies of the same data that could disagree, five reload paths, and a hand-rolled `requestIdRef` stale-response guard in three of them (Folder-browse, Search, Settings) because two overlapping reloads could resolve out of order.

We considered `useLiveQuery` from `drizzle-orm/expo-sqlite`, which would keep each screen's query fresh automatically and delete the reload paths. It was rejected as the whole answer: it removes the refetching but not the fragmentation — each screen still owns its own query, derived views (the Tasks rollup, search results) still can't be expressed as one, and there's still no single place that knows what the app currently holds.

We chose one shared store: a `useReducer` over `NotesState` (all Notes, all Folders, a load status) held by `NotesStoreProvider` and exposed through two contexts, with every screen's view of it derived by a pure selector rather than fetched. All writes go through the store, which persists via `NotesRepository` and folds the result into state, so an edit anywhere is visible everywhere immediately.

## Consequences

The whole Notes library is held in memory. Acceptable for a local-first, single-device app of this scale, and it makes derived views cheap — but it is the assumption to revisit first if a user's library ever gets large.

Search became a pure derivation rather than a repository call. `searchNotes` always read every Note and filtered in JS — `content` is opaque to SQL (ADR-0001), so there was never an index to use — so filtering the in-memory copy returns identical results. That removed the Search screen's debounce, its Folder cache, and its stale-response guard; `useDeferredValue` keeps typing responsive in place of the timer. The repository method stays, with the matching predicate (`matchesQuery`) extracted so both paths share one definition.

State and actions are deliberately two contexts. A combined value would change identity on every state change, and the Note editor keys its "flush or discard on the way out" cleanup to the screen's lifetime — with one context, a Note edited anywhere would re-run that cleanup mid-edit.

The reducer has to predict what the database will hold, since it no longer refetches to find out. `folderRemoved` therefore mirrors `deleteFolder`'s transaction by moving that Folder's Notes to Unfiled. A write that fails refreshes from the database rather than leaving an unpersisted change on screen.

The Tasks screen now freezes its display order while focused (`useStableTaskGroups`). With live data it would otherwise re-sort under the user's finger: ticking an item sinks it below the remaining open ones *and* floats its Note to the top on the `updatedAt` bump the edit earns.
