import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * The floating "new Note" button, sitting to the right of the navigation
 * pill (components/ui/nav-pill.tsx) at the same height.
 *
 * Rendered by each screen rather than by the tab bar, though the two read
 * as one row of chrome, because what it does is screen-specific: from a
 * Folder it creates a Note already filed there, from Home or Tasks an
 * Unfiled one (see CONTEXT.md's "Resolved behaviors"). A tab bar is shared
 * by every screen under it and has no way to know which Folder is being
 * browsed — and threading that up to it would put a screen's own action
 * inside the app's navigation.
 *
 * The two are aligned by rule rather than by layout: both are absolutely
 * positioned against the same 20pt side margins and the same
 * `insets.bottom + 12`, so they line up without either owning the other.
 */
export function AddNoteButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const accent = useThemeColor({}, "tint");

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + 12 }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => {
          // Creating a Note is the app's primary action and takes the user
          // to a new screen — worth a light tap of confirmation, the same
          // weight the checklist toggle uses.
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={[styles.fab, { backgroundColor: accent }]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="New Note"
      >
        <IconSymbol name="plus" size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    // Right-aligned, leaving the pill its natural width at the other end —
    // the two were one `space-between` row before they were split, and
    // this preserves that result without either one measuring the other.
    justifyContent: "flex-end",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
