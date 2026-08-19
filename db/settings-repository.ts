import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import {
  parsePreferences,
  toSettingValue,
  type Preferences,
} from '../lib/preferences';
import * as schema from './schema';
import { settings } from './schema';

/** Same shared drizzle shape `repository.ts` is built against — sync
 * driver, this app's schema, run-result type erased. */
type Database = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/**
 * Reads and writes the user's device-local preferences (ticket 09).
 *
 * Its own seam rather than more methods on `NotesRepository`: a preference
 * is neither a Note nor a Folder, it has no relationship to either, and
 * nothing that reads preferences (the theme) has any business holding a
 * handle to the one that can delete every Note. Callers see whole
 * `Preferences`, never rows or strings — the key/value table underneath
 * (see schema.ts) is an implementation detail of this file plus
 * `lib/preferences.ts`.
 */
export interface SettingsRepository {
  /** Every preference, with defaults filled in for any that was never
   * saved or whose stored value is no longer valid. Never rejects on bad
   * stored data. */
  loadPreferences(): Promise<Preferences>;
  /** Writes one preference, leaving the others untouched. */
  savePreference<K extends keyof Preferences>(name: K, value: Preferences[K]): Promise<void>;
}

export function createSettingsRepository(db: Database): SettingsRepository {
  return {
    async loadPreferences() {
      // The whole table, not three keyed lookups: it holds one short row
      // per preference, and reading it in one go keeps this to a single
      // query on the app's startup path.
      const rows = await db.select().from(settings);
      return parsePreferences(rows);
    },

    async savePreference(name, value) {
      const entry = toSettingValue(name, value);
      await db
        .insert(settings)
        .values(entry)
        // One row per key, always overwritten — the table is the current
        // state of the preferences, not a log of changes to them.
        .onConflictDoUpdate({ target: settings.key, set: { value: entry.value } });
    },
  };
}
