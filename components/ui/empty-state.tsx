import { Image } from "expo-image";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

/** The mascot's largest drawn size, and the fraction of the screen's
 * width it's allowed to take on narrower phones. Capped both ways so it
 * stays the same illustration on an SE and on a tablet rather than
 * ballooning with the frame. */
const MAX_MASCOT = 220;
const MASCOT_WIDTH_FRACTION = 0.55;

/**
 * The mascot lives on cream in light mode and reads fine, but it's drawn
 * as white paper — at full strength on the app's near-black dark surface
 * it glares like a lightbox. Knocking it back a little lets it sit *in*
 * the page rather than on top of it, without dimming it so far that it
 * looks broken.
 */
const DARK_MODE_OPACITY = 0.85;

/**
 * What a list shows in place of its contents: the app's mascot, a
 * heading, and a line about what to do. Shared by Home, Folder-browse,
 * and the Tasks rollup.
 *
 * Replaces a single line of grey text. An empty screen is the first thing
 * a new user sees and the one moment the app has nothing to say for
 * itself — worth more than an apology, and the mascot is already holding
 * a pen, so the copy can point at that rather than at the UI.
 *
 * Each caller supplies its own words: the reason a Tasks list is empty
 * ("nothing has a checklist yet") is a different fact about the app than
 * an empty Folder, and one generic "nothing here" would tell the user
 * neither.
 *
 * The illustration is an SVG rendered through `expo-image`, which handles
 * SVG natively on iOS, Android, and web — no `react-native-svg` and no
 * rasterized copies at three densities. The trade-off is that it draws as
 * authored: `tintColor` only applies to template (opacity-only) images, so
 * this one keeps its own blues rather than following the user's accent.
 * Recolouring it per-theme would mean inlining the paths as components,
 * which is a real dependency and a real conversion — see the note in
 * CONTEXT.md if that ever becomes worth it.
 */
export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const { width } = useWindowDimensions();
  const scheme = useColorScheme();
  const subtitleColor = useThemeColor({}, "placeholder");

  const size = Math.min(MAX_MASCOT, width * MASCOT_WIDTH_FRACTION);

  return (
    <View style={styles.container}>
      <Image
        // Relative rather than the `@/` alias every module import here
        // uses: assets resolve through Metro's asset registry, not the
        // module resolver that the alias is configured on.
        source={require("../../assets/notes_app_mascot.svg")}
        style={[
          styles.mascot,
          {
            width: size,
            opacity: scheme === "dark" ? DARK_MODE_OPACITY : 1,
          },
        ]}
        contentFit="contain"
        // Decorative: the heading and message below say everything this
        // conveys, so announcing it would only add a stop to swipe past.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.copy}>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.message, { color: subtitleColor }]}>
          {message}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 24,
  },
  mascot: {
    // Square, driven off the width set above. Paired with `flexShrink` so
    // that on a short screen — an SE, or landscape — it gives up size
    // before the words do, and shrinks in both directions rather than
    // squashing into a letterboxed band.
    aspectRatio: 1,
    flexShrink: 1,
  },
  copy: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    lineHeight: 21,
  },
});
