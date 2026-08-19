import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

/** The bar's fixed height. Exported because Home both pins this bar to
 * the top of the screen and reserves a gap for it in the list underneath
 * (app/(tabs)/(home)/index.tsx) — two places that must agree exactly, or
 * the list's content sits behind the bar or below a visible hole. */
export const SEARCH_BAR_HEIGHT = 48;

/** The Home screen's search entry point (ticket-less UI pass): reads as a
 * search bar but is really a button — tapping it opens the real, live
 * Search screen (app/search.tsx) rather than searching in place. Mirrors
 * the floating search icon in the bottom nav as a second, more prominent
 * way into the same screen. */
export function SearchBarButton({ onPress }: { onPress: () => void }) {
  const surface = useThemeColor({}, "surface");
  const placeholder = useThemeColor({}, "placeholder");
  const separator = useThemeColor({}, "separator");

  return (
    <Pressable
      onPress={onPress}
      style={[styles.bar, { backgroundColor: surface, borderColor: separator }]}
      accessibilityRole="button"
      accessibilityLabel="Search Notes"
    >
      <IconSymbol name="magnifyingglass" size={18} color={placeholder} />
      <ThemedText style={[styles.label, { color: placeholder }]}>Search Notes</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: SEARCH_BAR_HEIGHT,
    borderRadius: 24,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 16,
  },
});
