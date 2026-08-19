import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export interface ChoiceOption<T extends string> {
  id: T;
  label: string;
}

/**
 * A labelled segmented control — the shape every either/or preference on
 * the Settings screen takes (theme mode, note text size). Every option is
 * on screen at once rather than behind a picker: there are only ever a
 * handful, and seeing the alternatives is most of the point of a settings
 * screen.
 *
 * Selection is drawn in the accent color, which is itself a preference —
 * so changing the accent visibly re-colors these controls too.
 */
export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const accent = useThemeColor({}, "tint");
  const trackColor = useThemeColor({}, "surfaceAlt");
  const labelColor = useThemeColor({}, "text");

  return (
    <View style={styles.row}>
      <ThemedText style={[styles.label, { color: labelColor }]}>{label}</ThemedText>
      {/* `radiogroup` rather than a bare container: these are mutually
          exclusive options, and it lets a screen reader announce "2 of 3"
          as the user moves across them. */}
      <View
        style={[styles.track, { backgroundColor: trackColor }]}
        accessibilityRole="radiogroup"
      >
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                if (selected) return;
                // These preferences apply instantly and re-theme the very
                // screen the user is touching — a selection tick marks the
                // moment the change lands.
                void Haptics.selectionAsync();
                onChange(option.id);
              }}
              style={[styles.segment, selected && { backgroundColor: accent }]}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityState={{ selected }}
            >
              <ThemedText
                type="defaultSemiBold"
                style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
  },
  label: {
    fontSize: 15,
  },
  track: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLabel: {
    fontSize: 14,
  },
  segmentLabelSelected: {
    // Every accent in the palette is chosen to carry white text (see
    // constants/theme.ts), so the selected segment doesn't need a
    // per-accent foreground color — same as the FAB's icon.
    color: "#FFFFFF",
  },
});
