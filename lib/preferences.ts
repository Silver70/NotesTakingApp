/**
 * The user's device-local preferences (ticket 09) as a domain, kept free
 * of React and of the database the same way lib/notes/* is: what a
 * preference *is*, what its default is, and how to read one back out of
 * the opaque strings the `settings` table stores.
 *
 * Everything here is total — an unrecognised, missing, or hand-edited
 * stored value resolves to that preference's default rather than throwing.
 * These values come off disk, survive app upgrades that may have dropped
 * an option, and drive the theme itself; a preference that could crash the
 * app on read would be worse than one that quietly reverts.
 */

import { Accents, DEFAULT_ACCENT, type AccentId } from '../constants/theme';

/** How the app decides between its light and dark palettes: follow the
 * device, or override it. */
export type ThemeMode = 'system' | 'light' | 'dark';

/** The size of a Note's body text in the editor. */
export type NoteTextSize = 'small' | 'medium' | 'large';

export interface Preferences {
  themeMode: ThemeMode;
  accent: AccentId;
  noteTextSize: NoteTextSize;
}

export const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export const NOTE_TEXT_SIZES: { id: NoteTextSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

/** In CSS pixels, since the Note body is a WebView document. Kept apart
 * from the list above, which exists to drive the picker's order and
 * labels — a total lookup, so no size can be missing and none needs a
 * fallback. */
const NOTE_FONT_SIZES_PX: Record<NoteTextSize, number> = {
  small: 15,
  medium: 17,
  large: 20,
};

export const DEFAULT_PREFERENCES: Preferences = {
  themeMode: 'system',
  accent: DEFAULT_ACCENT,
  noteTextSize: 'medium',
};

/** The `settings.key` each preference is stored under. Snake-cased and
 * spelled out rather than reusing the TypeScript field names, since these
 * strings outlive any rename on this side. */
export const PREFERENCE_KEYS = {
  themeMode: 'theme_mode',
  accent: 'accent',
  noteTextSize: 'note_text_size',
} as const;

type PreferenceName = keyof Preferences;

/** Per preference: its stored key, and the check that turns a stored
 * string back into a value of the right type. Written as one table so a
 * new preference is one entry rather than a new branch in three
 * functions. */
const PREFERENCE_SPECS: {
  [K in PreferenceName]: { key: string; isValid: (value: string) => value is Preferences[K] };
} = {
  themeMode: {
    key: PREFERENCE_KEYS.themeMode,
    isValid: (value): value is ThemeMode => THEME_MODES.some((mode) => mode.id === value),
  },
  accent: {
    key: PREFERENCE_KEYS.accent,
    isValid: (value): value is AccentId => Accents.some((entry) => entry.id === value),
  },
  noteTextSize: {
    key: PREFERENCE_KEYS.noteTextSize,
    isValid: (value): value is NoteTextSize => NOTE_TEXT_SIZES.some((size) => size.id === value),
  },
};

const PREFERENCE_NAMES = Object.keys(PREFERENCE_SPECS) as PreferenceName[];

export interface SettingEntry {
  key: string;
  value: string;
}

/** Resolves stored `settings` rows into a complete set of preferences —
 * every field present, every unknown key ignored, every unrecognised value
 * replaced by its default. Callers get a whole `Preferences`, never a
 * partial one to merge themselves. */
export function parsePreferences(entries: readonly SettingEntry[]): Preferences {
  const stored = new Map(entries.map((entry) => [entry.key, entry.value]));
  const preferences = { ...DEFAULT_PREFERENCES };

  for (const name of PREFERENCE_NAMES) {
    const spec = PREFERENCE_SPECS[name];
    const value = stored.get(spec.key);
    if (value !== undefined && spec.isValid(value)) {
      // Each spec's `isValid` narrows to that preference's own type, but
      // the loop's `name` is the union of all of them, so TypeScript can't
      // see the two line up field by field.
      (preferences[name] as Preferences[typeof name]) = value;
    }
  }

  return preferences;
}

/** The `settings` row a single preference is written as — the inverse of
 * `parsePreferences` for one field. */
export function toSettingValue<K extends PreferenceName>(
  name: K,
  value: Preferences[K],
): SettingEntry {
  return { key: PREFERENCE_SPECS[name].key, value };
}

/** Which of the two palettes to paint with, given the user's choice and
 * whatever the device currently reports. React Native's `useColorScheme`
 * can return null (no scheme reported yet), which the app has always
 * treated as light. */
export function resolveColorScheme(
  mode: ThemeMode,
  systemScheme: 'light' | 'dark' | null | undefined,
): 'light' | 'dark' {
  if (mode === 'system') {
    return systemScheme ?? 'light';
  }
  return mode;
}

/** The Note body's font size in CSS pixels — the editor's text lives in a
 * WebView, so this is injected as CSS rather than applied as an RN style
 * (see app/note/[id].tsx). */
export function noteFontSizePx(size: NoteTextSize): number {
  return NOTE_FONT_SIZES_PX[size];
}
