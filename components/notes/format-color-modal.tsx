import { useBridgeState, type EditorBridge } from "@10play/tentap-editor";
import * as Haptics from "expo-haptics";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * The text colours on offer.
 *
 * Mid-tones, deliberately — a colour chosen here is stored *in the Note*,
 * so it outlives the theme it was picked under. The same hex has to stay
 * legible on the light editor surface and on the dark one, which rules out
 * anything near either end: a deep navy vanishes on espresso, a pastel
 * vanishes on cream.
 */
const TEXT_COLORS = [
  { id: "#E5533D", label: "Red" },
  { id: "#E08A2E", label: "Amber" },
  { id: "#4FA355", label: "Green" },
  { id: "#3E8FD0", label: "Blue" },
  { id: "#A96FD0", label: "Purple" },
] as const;

/**
 * The highlight colours, all translucent.
 *
 * A highlight sets a background behind text whose own colour it doesn't
 * control, and in dark mode that text is nearly white — an opaque pastel
 * yellow would leave white-on-cream, i.e. unreadable. At ~35% alpha the
 * highlight *tints* whatever is behind it instead of replacing it, so the
 * same value reads as pale yellow on the light surface and as a warm dark
 * wash on the dark one, with the text legible on both.
 */
const HIGHLIGHT_COLORS = [
  { id: "rgba(255, 214, 10, 0.35)", label: "Yellow", swatch: "#FFD60A" },
  { id: "rgba(126, 217, 87, 0.35)", label: "Green", swatch: "#7ED957" },
  { id: "rgba(90, 200, 250, 0.35)", label: "Blue", swatch: "#5AC8FA" },
  { id: "rgba(255, 138, 216, 0.35)", label: "Pink", swatch: "#FF8AD8" },
  { id: "rgba(255, 149, 74, 0.35)", label: "Orange", swatch: "#FF954A" },
] as const;

/**
 * Text colour and highlight for the Note editor, in one sheet.
 *
 * Both capabilities were already compiled into TenTap's editor bundle
 * (`setColor`/`setHighlight`) but absent from its default toolbar, and its
 * own `EditColorBar` is a stub with nothing in it but a DONE button — so
 * the picker is ours. One sheet rather than two toolbar buttons: they are
 * the same decision ("how should this text look") made twice, and the
 * editor's floating toolbar is already scrolling horizontally on most
 * phones without adding two more icons to it.
 *
 * A curated set rather than a colour wheel, the same call the accent
 * picker makes (components/settings/accent-picker.tsx): every value here
 * is one that stays readable in both themes, which an arbitrary hex would
 * not be.
 *
 * Tapping the swatch that is already applied removes it, rather than
 * making the user find a separate "no colour" control — the toggle every
 * swatch grid behaves like. The explicit clear chip stays, but only
 * appears once there is something to clear: it is the only way out when
 * the active colour isn't one of the five below, which is what pasted
 * content from another app can leave behind.
 *
 * Takes the editor rather than a set of values and callbacks so that
 * `useBridgeState` — which fires on every selection change and every
 * keystroke — is subscribed to *here*. Reading it in the editor screen
 * instead would re-render that whole screen, WebView chrome and all, for
 * a tick mark inside a sheet that is usually closed.
 */
export function FormatColorModal({
  visible,
  editor,
  onClose,
}: {
  visible: boolean;
  editor: EditorBridge;
  onClose: () => void;
}) {
  const { activeColor, activeHighlight } = useBridgeState(editor);
  const separatorColor = useThemeColor({}, "separator");
  const placeholderColor = useThemeColor({}, "placeholder");
  const tintColor = useThemeColor({}, "tint");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Tapping the backdrop dismisses — the sheet applies each change as
          it's tapped, so there is nothing to confirm and nothing to lose
          by closing it. */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        {/* Swallows taps on the sheet itself so they don't reach the
            backdrop's dismiss handler underneath. */}
        <Pressable style={styles.cardWrap} onPress={() => {}}>
          <ThemedView
            style={styles.card}
            accessibilityViewIsModal
            accessibilityLabel="Text colour and highlight"
          >
            <Section
              title="Text colour"
              swatches={TEXT_COLORS.map((c) => ({ ...c, swatch: c.id }))}
              active={activeColor}
              clearLabel="Default"
              onSelect={(color) => editor.setColor(color)}
              onClear={() => editor.unsetColor()}
              separatorColor={separatorColor}
              placeholderColor={placeholderColor}
              tintColor={tintColor}
            />
            <View style={[styles.divider, { backgroundColor: separatorColor }]} />
            <Section
              title="Highlight"
              swatches={HIGHLIGHT_COLORS.map((c) => ({ ...c }))}
              active={activeHighlight}
              clearLabel="None"
              onSelect={(color) => editor.setHighlight(color)}
              onClear={() => editor.unsetHighlight()}
              separatorColor={separatorColor}
              placeholderColor={placeholderColor}
              tintColor={tintColor}
            />
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Section({
  title,
  swatches,
  active,
  clearLabel,
  onSelect,
  onClear,
  separatorColor,
  placeholderColor,
  tintColor,
}: {
  title: string;
  swatches: readonly { id: string; label: string; swatch: string }[];
  active?: string;
  clearLabel: string;
  onSelect: (color: string) => void;
  onClear: () => void;
  separatorColor: string;
  placeholderColor: string;
  tintColor: string;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: placeholderColor }]}>
        {title}
      </ThemedText>
      <View style={styles.swatches} accessibilityRole="radiogroup">
        {swatches.map((entry) => {
          const selected = active === entry.id;
          return (
            <Pressable
              key={entry.id}
              onPress={() => {
                void Haptics.selectionAsync();
                // Tapping what's already applied takes it off again.
                if (selected) {
                  onClear();
                } else {
                  onSelect(entry.id);
                }
              }}
              style={[
                styles.swatch,
                { backgroundColor: entry.swatch, borderColor: separatorColor },
              ]}
              hitSlop={6}
              accessibilityRole="radio"
              accessibilityLabel={`${title}: ${entry.label}`}
              accessibilityState={{ selected }}
              // A toggle nobody can see is a toggle nobody can use.
              accessibilityHint={selected ? `Removes ${title.toLowerCase()}` : undefined}
            >
              {selected ? (
                // Drawn on the app's own accent rather than on the swatch,
                // so the tick reads against a pale highlight as well as a
                // saturated text colour.
                <View style={[styles.tick, { backgroundColor: tintColor }]}>
                  <IconSymbol name="checkmark" size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {active ? (
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              onClear();
            }}
            style={[styles.clear, { borderColor: separatorColor }]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${title}: ${clearLabel}`}
          >
            <ThemedText type="caption" style={{ color: placeholderColor }}>
              {clearLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  cardWrap: {
    width: "100%",
    maxWidth: 380,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  swatches: {
    flexDirection: "row",
    alignItems: "center",
    // Wraps rather than scrolls: at large text sizes the "Default"/"None"
    // chip is wide enough to push a swatch off a narrow screen, and a row
    // that silently hides an option is worse than one that grows.
    flexWrap: "wrap",
    gap: 10,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  tick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  clear: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
