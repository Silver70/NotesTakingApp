import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../drizzle/migrations/migrations';
import * as schema from './schema';

const DATABASE_NAME = 'notesapp.db';

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

/** Opens (creating if needed) the on-device SQLite database used by the app at runtime. */
export function openDatabase(): AppDatabase {
  const expo = openDatabaseSync(DATABASE_NAME);
  // SQLite disables FK enforcement per-connection by default. Without this,
  // the `notes.folder_id -> folders.id` FK (see schema.ts) would be purely
  // decorative: only `NotesRepository.deleteFolder`'s own transaction would
  // stand between a deleted Folder and orphaned Notes.
  expo.execSync('PRAGMA foreign_keys = ON;');
  return drizzle(expo, { schema });
}

/** Applies any pending migrations. Call once at app startup before using the repository. */
export function runMigrations(db: AppDatabase): Promise<void> {
  return migrate(db, migrations);
}
