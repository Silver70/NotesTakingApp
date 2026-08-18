import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from '../schema';

/**
 * A real, in-memory SQLite database (via better-sqlite3) built from the
 * same drizzle-kit-generated migrations the app runs on expo-sqlite.
 *
 * Test-only: better-sqlite3 is a native Node module that isn't available
 * in the React Native runtime, so this file must never be imported from
 * app code — only from tests, which run under plain Node/Jest.
 */
export function createTestDatabase() {
  const sqlite = new Database(':memory:');
  // Mirror db/client.ts: don't rely on better-sqlite3's own default for
  // this pragma, pin it explicitly so tests exercise the same FK
  // enforcement the app runtime has.
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle/migrations') });
  return db;
}
