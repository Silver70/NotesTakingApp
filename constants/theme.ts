/**
 * The app's color palette — warm and earthy (terracotta accent on cream /
 * espresso surfaces), light and dark variants. `surface`/`surfaceAlt` back
 * cards and chips; `navBackground` is the floating bottom nav/toolbar's
 * pill color, deliberately near-constant across themes (see
 * components/ui/bottom-nav.tsx) so it reads as one consistent piece of
 * chrome regardless of the rest of the screen's theme.
 *
 * `Colors` is the palette at the app's default (terracotta) accent.
 * Settings (ticket 09) lets the user pick a different one, so screens
 * read their colors through `useThemeColor`, which serves
 * `buildColors(accent)` below rather than this object directly — nothing
 * outside that hook and the accent picker itself should import `Colors`.
 */

import { Platform } from 'react-native';

/**
 * The fixed set of accent colors Settings offers (ticket 09) — a small
 * curated palette rather than a color wheel, so every choice stays legible
 * as white-on-accent (the FAB, active toolbar buttons) in both themes.
 * Each accent carries its own light/dark pair for the same reason the base
 * palette does: a hue dark enough to read on cream is too muddy on
 * espresso.
 *
 * The first entry is the app's default and the one `Colors` below is
 * built from.
 */
export const Accents = [
  { id: 'terracotta', label: 'Terracotta', light: '#D2693A', dark: '#E5824F' },
  { id: 'sage', label: 'Sage', light: '#4F7A52', dark: '#7FA982' },
  { id: 'ocean', label: 'Ocean', light: '#2F6F9E', dark: '#62A0CE' },
  { id: 'plum', label: 'Plum', light: '#7A4A86', dark: '#A97BB4' },
  { id: 'rose', label: 'Rose', light: '#B03A5B', dark: '#D9738F' },
] as const;

export type AccentId = (typeof Accents)[number]['id'];

export const DEFAULT_ACCENT: AccentId = Accents[0].id;

// Annotated `string`, not left to inference: `Accents` is `as const`, so
// without this every color in `Colors` below would take the *literal* type
// of the default accent and no other accent would be assignable to it.
const tintColorLight: string = Accents[0].light;
const tintColorDark: string = Accents[0].dark;

export const Colors = {
  light: {
    text: '#2B2016',
    background: '#F7F1E7',
    surface: '#FFFFFF',
    surfaceAlt: '#EFE1CC',
    tint: tintColorLight,
    icon: '#8A7A64',
    tabIconDefault: '#8A7A64',
    tabIconSelected: tintColorLight,
    separator: '#E7DAC4',
    placeholder: '#A0907A',
    danger: '#C4432F',
    navBackground: '#241A11',
    navIconInactive: '#B7A88F',
    navIconActive: '#FFFFFF',
  },
  dark: {
    text: '#F3E9DB',
    background: '#171310',
    surface: '#241D16',
    surfaceAlt: '#2E2519',
    tint: tintColorDark,
    icon: '#A79680',
    tabIconDefault: '#A79680',
    tabIconSelected: tintColorDark,
    separator: '#372C21',
    placeholder: '#8C7B66',
    danger: '#E5695A',
    navBackground: '#0E0B08',
    navIconInactive: '#8C7B66',
    navIconActive: '#F3E9DB',
  },
};

export type ThemePalette = typeof Colors;

/**
 * The whole palette rebuilt around a chosen accent. Every accent-derived
 * surface in the app (the FAB, active nav/toolbar states, the selected
 * check in Settings) reads `tint` or `tabIconSelected`, so swapping those
 * two here is enough — no screen has to learn that accents exist. Called
 * once per accent change at provider level, not per component.
 */
export function buildColors(accent: AccentId): ThemePalette {
  const entry = Accents.find((candidate) => candidate.id === accent) ?? Accents[0];
  return {
    light: { ...Colors.light, tint: entry.light, tabIconSelected: entry.light },
    dark: { ...Colors.dark, tint: entry.dark, tabIconSelected: entry.dark },
  };
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
