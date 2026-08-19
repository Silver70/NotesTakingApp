import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccentPicker } from "@/components/settings/accent-picker";
import { ChoiceRow } from "@/components/settings/choice-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomNav, NAV_ROUTES } from "@/components/ui/bottom-nav";
import { useNotesRepository } from "@/db/context";
import { usePreferences } from "@/hooks/use-preferences";
import { useThemeColor } from "@/hooks/use-theme-color";
import { NOTE_TEXT_SIZES, THEME_MODES } from "@/lib/preferences";

/**
 * Settings (ticket 09): the app's third nav destination, and the only
 * screen that writes preferences rather than just reading them.
 *
 * Everything here is device-local — theme mode, accent, note text size,
 * and a small data section. There is no account, profile, backup, or sync
 * to put on this screen and there isn't meant to be (see CONTEXT.md's
 * local-first framing and spec.md's Out of Scope).
 *
 * The appearance controls take effect on the tap, everywhere, with no
 * "apply" step: `PreferencesProvider` updates state first and persists
 * behind it, and the palette every screen reads flows from that same
 * state — so this screen's own colors change under the finger that
 * changed them, which is the clearest possible preview of the choice.
 */
export default function SettingsScreen() {
  const repo = useNotesRepository();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preferences, setPreference } = usePreferences();
  const subtitleColor = useThemeColor({}, "placeholder");
  const dangerColor = useThemeColor({}, "danger");
  const separatorColor = useThemeColor({}, "separator");

  const [counts, setCounts] = useState<{ notes: number; folders: number } | null>(null);

  // Guards a stale response from clobbering a fresher one — the reload
  // fired after "Delete all Notes" races the one this screen's focus
  // started, and the older answer would put the old Note count straight
  // back on screen. Same requestIdRef pattern as app/search.tsx and
  // app/tasks.tsx.
  const requestIdRef = useRef(0);

  const reloadCounts = useCallback(() => {
    const requestId = ++requestIdRef.current;
    Promise.all([repo.countNotes(), repo.countFolders()])
      .then(([notes, folders]) => {
        if (requestId !== requestIdRef.current) return;
        setCounts({ notes, folders });
      })
      .catch((error) => {
        console.error("Failed to load counts", error);
      });
  }, [repo]);

  // Same `useFocusEffect` reload every list screen does — Notes and
  // Folders are created and deleted on other screens, and these counts
  // have no other way to hear about it.
  useFocusEffect(reloadCounts);

  const handleDeleteAllNotes = useCallback(() => {
    // Deliberately the same native `Alert.alert` confirmation a single
    // Note's delete uses (app/index.tsx), for the same reason: deletion is
    // immediate and irreversible — no Trash, no undo (ADR-0003) — so the
    // confirmation is the only thing between the tap and the loss. Folders
    // are untouched: deleting Notes and deleting Folders have never been
    // the same action in either direction (CONTEXT.md, "Folder").
    Alert.alert(
      "Delete all Notes?",
      "Every Note will be permanently deleted. Your Folders will be kept. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              await repo.deleteAllNotes();
              reloadCounts();
            } catch (error) {
              console.error("Failed to delete all notes", error);
              Alert.alert("Couldn't delete your Notes", "Please try again.");
            }
          },
        },
      ],
    );
  }, [repo, reloadCounts]);

  // Until the counts land, assume there are Notes: the alternative is a
  // delete control that starts out disabled on every launch and enables
  // itself a moment later.
  const hasNotes = counts === null || counts.notes > 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 },
        ]}
      >
        <ThemedText type="largeTitle">Settings</ThemedText>

        <SettingsSection title="Appearance">
          <ChoiceRow
            label="Theme"
            options={THEME_MODES}
            value={preferences.themeMode}
            onChange={(themeMode) => setPreference("themeMode", themeMode)}
          />
          <AccentPicker
            label="Accent color"
            value={preferences.accent}
            onChange={(accent) => setPreference("accent", accent)}
          />
          <ChoiceRow
            label="Note text size"
            options={NOTE_TEXT_SIZES}
            value={preferences.noteTextSize}
            onChange={(noteTextSize) => setPreference("noteTextSize", noteTextSize)}
          />
        </SettingsSection>

        <SettingsSection title="Data">
          <View style={styles.stats}>
            <Stat label="Notes" value={counts?.notes} />
            <View style={[styles.statDivider, { backgroundColor: separatorColor }]} />
            <Stat label="Folders" value={counts?.folders} />
          </View>
          <Pressable
            onPress={handleDeleteAllNotes}
            disabled={!hasNotes}
            style={styles.dangerRow}
            accessibilityRole="button"
            accessibilityLabel="Delete all Notes"
            accessibilityState={{ disabled: !hasNotes }}
          >
            <ThemedText
              type="defaultSemiBold"
              style={{ color: dangerColor, opacity: hasNotes ? 1 : 0.4 }}
            >
              Delete all Notes
            </ThemedText>
          </Pressable>
          <ThemedText type="caption" style={{ color: subtitleColor }}>
            Deletes every Note permanently. Folders are kept.
          </ThemedText>
        </SettingsSection>
      </ScrollView>
      <BottomNav
        active="settings"
        onNavigate={(section) => router.push(NAV_ROUTES[section])}
        onAdd={() => router.push("/note/new")}
      />
    </ThemedView>
  );
}

/** One of the two counts in the Data section. Renders an em dash until the
 * count has loaded, rather than a placeholder zero that would read as
 * "you have no Notes". */
function Stat({ label, value }: { label: string; value: number | undefined }) {
  const labelColor = useThemeColor({}, "placeholder");

  return (
    <View style={styles.stat}>
      <ThemedText type="title" style={styles.statValue}>
        {value ?? "—"}
      </ThemedText>
      <ThemedText type="caption" style={{ color: labelColor }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 24,
    paddingHorizontal: 20,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 34,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  dangerRow: {
    paddingVertical: 4,
  },
});
