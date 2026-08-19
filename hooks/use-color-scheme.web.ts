import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { usePreferences } from '@/hooks/use-preferences';
import { resolveColorScheme } from '@/lib/preferences';

/**
 * The web twin of use-color-scheme.ts. Same theme-mode preference applied
 * on top, plus the existing hydration guard: to support static rendering,
 * the *device* scheme has to be re-calculated client side, so it reads as
 * light until hydration. The preference itself needs no such guard — it
 * comes from the database, which only exists client side anyway.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const systemScheme = useSystemColorScheme();
  const { preferences } = usePreferences();

  return resolveColorScheme(preferences.themeMode, hasHydrated ? systemScheme : 'light');
}
