---
status: accepted
---

# Use expo-sqlite + Drizzle ORM for local storage, not WatermelonDB or Realm

Notes are stored locally only for the MVP (no accounts, no sync), but the schema needs to survive a future sync layer without a rewrite. We considered WatermelonDB and Realm/Atlas Device SDK, both popular choices for offline-first RN apps with built-in sync engines, but rejected both: Realm's Atlas Device Sync backend was discontinued by MongoDB in September 2025, making it a dead end for our "sync later" requirement; WatermelonDB requires a community Expo config plugin plus prebuild and has had recurring friction with React Native's New Architecture, for a sync engine we don't need yet. We chose `expo-sqlite` (first-party, New Architecture-native, synchronous JSI API) with `drizzle-orm` on top (officially documented Expo SQLite driver, type-safe schema and migrations) — no ejecting required, and if sync is added later it's a layer on top of the same SQLite file rather than a new database.

## Consequences

Note content (a rich-text JSON document from the editor) is stored as a serialized field in a SQLite table, not as structured relational data — search/filtering operates on that field, not on individual formatting marks.
