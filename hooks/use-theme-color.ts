/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePreferences } from '@/hooks/use-preferences';
import type { Colors } from '@/constants/theme';

/**
 * One color from the app's palette, for the scheme currently in effect.
 *
 * Reads the palette off `usePreferences` rather than the static `Colors`
 * object so the user's accent choice (ticket 09) reaches every
 * `tint`/`tabIconSelected` consumer — the FAB, active nav and toolbar
 * states, selection — without any of them being changed.
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme();
  const { colors } = usePreferences();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return colors[theme][colorName];
  }
}
