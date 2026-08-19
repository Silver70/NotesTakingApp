import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Accents, type AccentId } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * The accent swatches. Each is drawn in the exact color it will produce
 * *for the scheme currently on screen* — accents carry a light and a dark
 * variant (see constants/theme.ts), and a swatch showing the other one
 * would be showing the user a color they aren't about to get.
 */
export function AccentPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AccentId;
  onChange: (id: AccentId) => void;
}) {
  const scheme = useColorScheme();
  const labelColor = useThemeColor({}, "text");

  return (
    <View style={styles.row}>
      <ThemedText style={[styles.label, { color: labelColor }]}>{label}</ThemedText>
      <View style={styles.swatches}>
        {Accents.map((accent) => {
          const color = accent[scheme];
          const selected = accent.id === value;
          return (
            <Pressable
              key={accent.id}
              onPress={() => onChange(accent.id)}
              style={[styles.swatch, { backgroundColor: color }]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Accent color: ${accent.label}`}
              accessibilityState={{ selected }}
            >
              {selected ? <IconSymbol name="checkmark" size={18} color="#FFFFFF" /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 12,
  },
  label: {
    fontSize: 15,
  },
  swatches: {
    flexDirection: "row",
    gap: 14,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
