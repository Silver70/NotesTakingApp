import * as Haptics from "expo-haptics";
import { useCallback, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import type { ZoomOrigin } from "@/components/ui/zoom-open-overlay";
import { useThemeColor } from "@/hooks/use-theme-color";

/** Half the FAB's 56pt box — the radius the open animation grows from, so
 * the card starts out exactly this button rather than near it. */
const FAB_RADIUS = 28;

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
 *
 * Hands its own on-screen position to `onPress` so the editor can appear
 * to grow out of it (components/ui/zoom-open-overlay.tsx). Measured at
 * press time rather than cached from layout: the button moves with the
 * safe-area inset and the keyboard, and a stale position would start the
 * animation somewhere the user didn't tap.
 */
export function AddNoteButton({
  onPress,
}: {
  onPress: (origin: ZoomOrigin) => void;
}) {
  const insets = useSafeAreaInsets();
  const accent = useThemeColor({}, "tint");
  const buttonRef = useRef<View>(null);

  const handlePress = useCallback(() => {
    // Creating a Note is the app's primary action and takes the user to a
    // new screen — worth a light tap of confirmation, the same weight the
    // checklist toggle uses.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const node = buttonRef.current;
    if (!node) {
      // Navigate from the screen's centre rather than not at all — a
      // missing ref is not a reason to drop the user's tap.
      onPress({ x: 0, y: 0, radius: FAB_RADIUS });
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      onPress({ x: x + width / 2, y: y + height / 2, radius: FAB_RADIUS });
    });
  }, [onPress]);

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + 12 }]}
      pointerEvents="box-none"
    >
      <Pressable
        ref={buttonRef}
        onPress={handlePress}
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
