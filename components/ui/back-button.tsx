import { Pressable, StyleSheet } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

/** A circular floating back button, replacing the native Stack header's
 * back chevron on every screen that now draws its own header (ticket-less
 * UI pass).
 *
 * `backgroundColor` overrides the default `surface` fill for screens whose
 * own background is already `surface` — the Note editor, whose header
 * blends into the page — where the default would leave the button
 * invisible but for its shadow. */
export function BackButton({
  onPress,
  backgroundColor,
}: {
  onPress: () => void;
  backgroundColor?: string;
}) {
  const surface = useThemeColor({}, "surface");
  const textColor = useThemeColor({}, "text");

  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, { backgroundColor: backgroundColor ?? surface }]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <IconSymbol name="chevron.left" size={20} color={textColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
