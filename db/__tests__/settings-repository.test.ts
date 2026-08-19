import { DEFAULT_PREFERENCES, PREFERENCE_KEYS } from '../../lib/preferences';
import { settings } from '../schema';
import { createSettingsRepository, type SettingsRepository } from '../settings-repository';
import { createTestDatabase } from '../test-utils/testDb';

describe('Settings repository', () => {
  let db: ReturnType<typeof createTestDatabase>;
  let repo: SettingsRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repo = createSettingsRepository(db);
  });

  it('returns the defaults on a fresh install', async () => {
    await expect(repo.loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
  });

  it('reads back a saved preference', async () => {
    await repo.savePreference('themeMode', 'dark');

    await expect(repo.loadPreferences()).resolves.toMatchObject({ themeMode: 'dark' });
  });

  it('saves each preference independently', async () => {
    await repo.savePreference('accent', 'ocean');
    await repo.savePreference('noteTextSize', 'large');

    await expect(repo.loadPreferences()).resolves.toEqual({
      ...DEFAULT_PREFERENCES,
      accent: 'ocean',
      noteTextSize: 'large',
    });
  });

  it('overwrites a preference rather than accumulating rows for it', async () => {
    await repo.savePreference('accent', 'ocean');
    await repo.savePreference('accent', 'plum');

    await expect(repo.loadPreferences()).resolves.toMatchObject({ accent: 'plum' });
    expect(await db.select().from(settings)).toHaveLength(1);
  });

  it('falls back to the default for a stored value it no longer recognises', async () => {
    await db.insert(settings).values({ key: PREFERENCE_KEYS.accent, value: 'chartreuse' });

    await expect(repo.loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
  });
});
