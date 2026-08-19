import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { LoadingView } from '@/components/loading-view';
import { buildColors } from '@/constants/theme';
import { useSettingsRepository } from '@/db/context';
import { PreferencesContext, type PreferencesContextValue } from '@/hooks/use-preferences';
import { DEFAULT_PREFERENCES, type Preferences } from '@/lib/preferences';

/**
 * Holds the user's preferences (ticket 09) for the whole app: loads them
 * once at startup, serves them to `use-color-scheme`/`useThemeColor`, and
 * writes each change back through `SettingsRepository`.
 *
 * Renders the shared loading spinner until that first load resolves rather
 * than rendering screens against the defaults and swapping a frame later —
 * that swap is exactly the "flash of the wrong theme" a user who picked
 * Dark would see on every launch. It costs one `select` against an
 * already-open database, and it extends the loading state
 * `DatabaseProvider` is already showing rather than adding a second one.
 *
 * Must be rendered inside `DatabaseProvider`.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const settings = useSettingsRepository();
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  useEffect(() => {
    let cancelled = false;

    settings
      .loadPreferences()
      .then((loaded) => {
        if (cancelled) return;
        setPreferences(loaded);
      })
      .catch((error) => {
        // Preferences that can't be read aren't worth blocking the app
        // over — every one of them has a default, and the user can set
        // theirs again from Settings.
        console.error('Failed to load preferences', error);
        if (cancelled) return;
        setPreferences(DEFAULT_PREFERENCES);
      });

    return () => {
      cancelled = true;
    };
  }, [settings]);

  const setPreference = useCallback<PreferencesContextValue['setPreference']>(
    (name, value) => {
      // Applied to state first so the theme changes on the tap rather than
      // after a database round trip; the write is fire-and-forget for the
      // same reason. A failed write costs the user their choice on the
      // next launch, not the change they just made.
      setPreferences((previous) => (previous ? { ...previous, [name]: value } : previous));
      settings.savePreference(name, value).catch((error) => {
        console.error('Failed to save preference', error);
      });
    },
    [settings],
  );

  const value = useMemo<PreferencesContextValue | null>(
    () =>
      preferences ? { preferences, colors: buildColors(preferences.accent), setPreference } : null,
    [preferences, setPreference],
  );

  if (!value) {
    return <LoadingView />;
  }

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
