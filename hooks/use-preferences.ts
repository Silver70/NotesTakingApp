import { createContext, useContext } from 'react';

import { buildColors, type ThemePalette } from '@/constants/theme';
import { DEFAULT_PREFERENCES, type Preferences } from '@/lib/preferences';

export interface PreferencesContextValue {
  preferences: Preferences;
  /** The full light/dark palette rebuilt around the chosen accent — what
   * `useThemeColor` serves, so screens never see accents at all. */
  colors: ThemePalette;
  /** Applies a preference immediately and persists it in the background. */
  setPreference: <K extends keyof Preferences>(name: K, value: Preferences[K]) => void;
}

/**
 * Defaults, not `null`: the theme has to have a defined value before the
 * database has even opened (`DatabaseProvider` renders its own loading and
 * error states outside the provider, and both are themed). A hook that
 * threw outside the provider would make those states unrenderable, so
 * anything above `PreferencesProvider` simply gets System + the app's
 * default accent.
 *
 * Lives here rather than beside the provider (components/
 * preferences-provider.tsx) so that `useThemeColor` — which every themed
 * component, the provider's own loading state included, goes through —
 * can read it without importing a component.
 */
export const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  colors: buildColors(DEFAULT_PREFERENCES.accent),
  setPreference: () => {},
});

/** The user's preferences, the palette built from them, and the setter
 * that changes one (ticket 09). Screens that only need colors should use
 * `useThemeColor` instead — this is for the Settings screen itself and for
 * the few places (the Note editor's text size) that read a preference
 * directly. */
export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext);
}
