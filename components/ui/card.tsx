import { StyleSheet, View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";

/** The one elevated-surface shape every card in the app (Note cards,
 * Folder chips' inner icon bubble aside) is built from — a themed
 * background, generous radius/padding, and a soft shadow, so every list
 * reads as a stack of cards rather than bare rows. */
export function Card({ style, ...rest }: ViewProps) {
  const backgroundColor = useThemeColor({}, "surface");
  return <View style={[styles.card, { backgroundColor }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
