import { Accents } from '../../constants/theme';

import {
  DEFAULT_PREFERENCES,
  NOTE_TEXT_SIZES,
  PREFERENCE_KEYS,
  noteFontSizePx,
  parsePreferences,
  resolveColorScheme,
  toSettingValue,
} from '../preferences';

describe('parsePreferences', () => {
  it('falls back to the defaults when nothing has been stored yet', () => {
    expect(parsePreferences([])).toEqual(DEFAULT_PREFERENCES);
  });

  it('reads every stored preference back', () => {
    const parsed = parsePreferences([
      { key: PREFERENCE_KEYS.themeMode, value: 'dark' },
      { key: PREFERENCE_KEYS.accent, value: 'ocean' },
      { key: PREFERENCE_KEYS.noteTextSize, value: 'large' },
    ]);

    expect(parsed).toEqual({ themeMode: 'dark', accent: 'ocean', noteTextSize: 'large' });
  });

  it('keeps the valid preferences when another one is unrecognised', () => {
    const parsed = parsePreferences([
      { key: PREFERENCE_KEYS.themeMode, value: 'neon' },
      { key: PREFERENCE_KEYS.accent, value: 'plum' },
    ]);

    expect(parsed.themeMode).toBe(DEFAULT_PREFERENCES.themeMode);
    expect(parsed.accent).toBe('plum');
  });

  it('ignores keys it does not know about', () => {
    expect(parsePreferences([{ key: 'from_a_future_version', value: 'whatever' }])).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it('accepts every accent the palette offers', () => {
    for (const accent of Accents) {
      expect(parsePreferences([{ key: PREFERENCE_KEYS.accent, value: accent.id }]).accent).toBe(
        accent.id,
      );
    }
  });
});

describe('toSettingValue', () => {
  it('round-trips a preference through its stored key and value', () => {
    const entry = toSettingValue('themeMode', 'light');

    expect(entry).toEqual({ key: PREFERENCE_KEYS.themeMode, value: 'light' });
    expect(parsePreferences([entry]).themeMode).toBe('light');
  });
});

describe('resolveColorScheme', () => {
  it('follows the device when the mode is System', () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
    expect(resolveColorScheme('system', 'light')).toBe('light');
  });

  it('assumes light when the device reports no scheme at all', () => {
    expect(resolveColorScheme('system', null)).toBe('light');
  });

  it('overrides the device when the user picked a mode explicitly', () => {
    expect(resolveColorScheme('light', 'dark')).toBe('light');
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
  });
});

describe('noteFontSizePx', () => {
  it('grows from small to large', () => {
    expect(noteFontSizePx('small')).toBeLessThan(noteFontSizePx('medium'));
    expect(noteFontSizePx('medium')).toBeLessThan(noteFontSizePx('large'));
  });

  it('offers a size for every option the Settings screen lists', () => {
    for (const size of NOTE_TEXT_SIZES) {
      expect(noteFontSizePx(size.id)).toBeGreaterThan(0);
    }
  });
});
