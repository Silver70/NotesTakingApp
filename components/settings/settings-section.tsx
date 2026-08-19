import { StyleSheet, View, type ViewProps } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * One titled group of settings — the same uppercase section label the Home
 * screen uses over its Folders/Notes strips, above the app's standard
 * `Card` surface, so Settings reads as part of the same UI rather than a
 * platform preferences pane.
 */
export function SettingsSection({
  title,
  style,
  children,
  ...rest
}: ViewProps & { title: string }) {
  const labelColor = useThemeColor({}, "placeholder");

  return (
    <View style={[styles.section, style]} {...rest}>
      <ThemedText type="defaultSemiBold" style={[styles.label, { color: labelColor }]}>
        {title}
      </ThemedText>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    gap: 18,
  },
});
