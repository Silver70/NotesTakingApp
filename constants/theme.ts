/**
 * The app's color palette — warm and earthy (terracotta accent on cream /
 * espresso surfaces), light and dark variants. `surface`/`surfaceAlt` back
 * cards and chips; `navBackground` is the floating bottom nav/toolbar's
 * pill color, deliberately near-constant across themes (see
 * components/ui/bottom-nav.tsx) so it reads as one consistent piece of
 * chrome regardless of the rest of the screen's theme.
 */

import { Platform } from 'react-native';

const tintColorLight = '#D2693A';
const tintColorDark = '#E5824F';

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
