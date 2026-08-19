import { useColorScheme as useSystemColorScheme } from 'react-native';

import { usePreferences } from '@/hooks/use-preferences';
import { resolveColorScheme } from '@/lib/preferences';

/**
 * Which palette the app paints with. Was a bare re-export of React
 * Native's hook; since ticket 09 it's the user's theme-mode preference
 * applied to that device value, so the whole app follows a Light/Dark
 * choice without any screen knowing the preference exists.
 *
 * Always resolves to a concrete scheme — unlike React Native's hook, it
 * never returns null (System with no device scheme reported means light).
 */
export function useColorScheme(): 'light' | 'dark' {
  const systemScheme = useSystemColorScheme();
  const { preferences } = usePreferences();
  return resolveColorScheme(preferences.themeMode, systemScheme);
}
