import { ActivityIndicator, StyleSheet, View } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

/** Where a Note's autosave currently stands. `idle` covers both "nothing
 * has been typed yet" and "the last save finished a while ago" — the
 * indicator says nothing in either case, since a Note that isn't being
 * edited has no save to report on. */
export type SaveStatus = "idle" | "saving" | "saved" | "failed";

const LABELS: Record<SaveStatus, string | undefined> = {
  idle: undefined,
  saving: "Saving",
  saved: "Saved",
  failed: "Couldn't save",
};

/**
 * The Note editor's autosave indicator. There is no Save button in this
 * app — edits are written by a debounced autosave (see `scheduleSave` in
 * app/note/[id].tsx) — so this is the only thing that tells the user
 * their typing has actually landed on disk.
 *
 * A fixed-size slot whether or not it's showing anything, so the header
 * doesn't shift as the status changes. Quiet by design: a spinner while
 * the write is pending, a muted tick just after, then nothing.
 */
export function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const tint = useThemeColor({}, "tint");
  const muted = useThemeColor({}, "placeholder");
  const danger = useThemeColor({}, "danger");

  return (
    <View
      style={styles.slot}
      accessible={status !== "idle"}
      accessibilityLabel={LABELS[status]}
    >
      {status === "saving" && <ActivityIndicator size="small" color={tint} />}
      {status === "saved" && (
        <IconSymbol name="checkmark.circle.fill" size={18} color={muted} />
      )}
      {/* Deliberately doesn't clear itself on a timer the way `saved`
          does: a failed write means the Note on disk is behind what's on
          screen, and that stays true until the next successful save. */}
      {status === "failed" && (
        <IconSymbol name="exclamationmark.triangle.fill" size={18} color={danger} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
