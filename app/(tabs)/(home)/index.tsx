import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FoldersRow } from "@/components/folders/folders-row";
import { NotesList } from "@/components/notes-list";
import { TextPromptModal } from "@/components/text-prompt-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AddNoteButton } from "@/components/ui/add-note-button";
import {
  SEARCH_BAR_HEIGHT,
  SearchBarButton,
} from "@/components/ui/search-bar-button";
import type { NoteRow } from "@/db/schema";
import { useFolderActions } from "@/hooks/use-folder-actions";
import { useFolders, useNotes, useNotesActions } from "@/hooks/use-notes-store";
import { useThemeColor } from "@/hooks/use-theme-color";
import { toZoomParams } from "@/lib/zoom-origin";

/** The vertical rhythm the header's blocks are spaced on. Shared by the
 * scrollable header below and the pinned bar's geometry, which have to
 * agree on where the search bar naturally sits. */
const HEADER_GAP = 20;

/** How much scrolling the pinned bar's background fades in over, ending
 * exactly as the search bar reaches its pinned position. Short on purpose:
 * a long fade reads as the background lagging behind the bar it belongs to. */
const BACKDROP_FADE_PX = 24;

/** The gap between the safe area and the header's first line — the title
 * at rest, and the search bar once pinned. */
const TOP_INSET_GAP = 8;

/** `largeTitle`'s line height (see components/themed-text.tsx), used only
 * to place the search bar on the very first frame, before `onLayout` has
 * reported the title's real height. Wrong for wrapped or scaled text,
 * which is exactly why it is replaced by a measurement rather than relied
 * on — it only has to be close enough to avoid a visible jump. */
const LARGE_TITLE_LINE_HEIGHT = 42;

/**
 * The app's landing screen (ticket-less UI pass, replacing the split
 * Folders-list/"All Notes" screens from ticket 05): a search entry point,
 * a horizontal strip of every Folder, and every Note — regardless of
 * Folder — as cards below, most-recently-edited first. Folders are flat
 * and shown with a single fixed icon (see CONTEXT.md, "Folder") — there's
 * nothing per-folder to customize, just a name to create, rename, or
 * delete (via FoldersRow's long-press).
 *
 * **The header collapses rather than scrolling away entirely.** The title
 * and Folders row scroll off normally, but the search bar slides up with
 * them and stops at the top of the screen, staying reachable at any scroll
 * position — the pattern Apple Notes and Mail use, and for the reason they
 * use it: search is useful wherever you are in a list, whereas a 38pt
 * "Your Notes" title tells you nothing once you're already scrolling.
 * Pinning the whole header block instead would cost ~355pt — over 40% of
 * an iPhone 14's screen, and more than half an SE's — in a screen whose
 * job is showing Notes.
 *
 * The search bar is a single element that *moves*, not two that cross-fade:
 * it lives in the pinned layer and is translated down to its resting place
 * in the header, with the list reserving an equal gap for it. That way
 * there's no moment where two copies are visible or none is.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sectionLabelColor = useThemeColor({}, "placeholder");
  const backgroundColor = useThemeColor({}, "background");
  const separatorColor = useThemeColor({}, "separator");

  // Read straight off the shared store (components/notes-store-provider.tsx)
  // — no local copy and no `useFocusEffect` reload. A Note created, edited,
  // or discarded in the editor updated this list as it happened, so there
  // is nothing left to re-fetch on the way back.
  const notes = useNotes();
  const folders = useFolders();
  const { createFolder, deleteNote } = useNotesActions();

  const [creatingFolder, setCreatingFolder] = useState(false);

  // Measured rather than computed from the font size: the title wraps to
  // two lines at large Dynamic Type settings, and a hard-coded height
  // would pin the search bar over it (or leave a gap under it) for exactly
  // the users least able to absorb the mistake. Seeded with an estimate so
  // the bar is in roughly the right place on the first frame rather than
  // jumping once the measurement lands.
  //
  // Note this is the title's *padded* box, so it already includes the safe
  // area — every offset below is therefore in screen coordinates, not
  // relative to the safe area.
  const [titleHeight, setTitleHeight] = useState(
    () => insets.top + TOP_INSET_GAP + LARGE_TITLE_LINE_HEIGHT,
  );
  const onTitleLayout = useCallback((event: LayoutChangeEvent) => {
    setTitleHeight(event.nativeEvent.layout.height);
  }, []);

  // Where the search bar sits with the list scrolled to the top, and where
  // it comes to rest once pinned. The difference between them is how far
  // the user has to scroll before it stops moving.
  const searchRestY = titleHeight + HEADER_GAP;
  const searchPinnedY = insets.top + TOP_INSET_GAP;
  const pinPoint = searchRestY - searchPinnedY;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const searchStyle = useAnimatedStyle(() => ({
    // Follows the list one-for-one until it reaches its pinned position,
    // then stops. `Math.max` rather than clamping both ends deliberately:
    // over-scroll (a negative offset) should carry the bar back *down*
    // with the content, the way a real header behaves when the list is
    // pulled past its top.
    transform: [
      { translateY: Math.max(searchPinnedY, searchRestY - scrollY.value) },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    // Finishes exactly as the bar pins — the background arriving early
    // would read as a panel sliding in behind a bar that is still moving.
    opacity: interpolate(
      scrollY.value,
      [pinPoint - BACKDROP_FADE_PX, pinPoint],
      [0, 1],
      "clamp",
    ),
  }));

  const { renamingFolder, setRenamingFolder, handleRename, showOptions } =
    useFolderActions();

  const handleCreateFolder = useCallback(
    async (name: string) => {
      try {
        await createFolder(name);
        setCreatingFolder(false);
      } catch (error) {
        console.error("Failed to create folder", error);
        Alert.alert("Couldn't create this Folder", "Please try again.");
      }
    },
    [createFolder],
  );

  const handleDeleteNote = useCallback(
    (note: NoteRow) => {
      Alert.alert("Delete Note?", "This can't be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // A warning tick at the moment data is actually lost:
              // deletion here is immediate and irreversible (ADR-0003).
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
              await deleteNote(note.id);
            } catch (error) {
              console.error("Failed to delete note", error);
              Alert.alert("Couldn't delete this Note", "Please try again.");
            }
          },
        },
      ]);
    },
    [deleteNote],
  );

  return (
    <ThemedView style={styles.container}>
      <NotesList
        notes={notes}
        onPress={(note) => router.push(`/note/${note.id}`)}
        onDelete={handleDeleteNote}
        onScroll={onScroll}
        emptyTitle="Nothing written down yet"
        emptyMessage="Pen's ready when you are, tap + to start your first Note."
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText
              type="largeTitle"
              onLayout={onTitleLayout}
              style={{ paddingTop: insets.top + 8 }}
            >
              Your Notes
            </ThemedText>
            {/* The search bar itself is drawn in the pinned layer below —
                this only holds its place in the scroll content, so the
                Folders row starts where it would have. */}
            <View style={styles.searchSpacer} />
            <View style={styles.foldersSection}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.sectionLabel, { color: sectionLabelColor }]}
              >
                Folders
              </ThemedText>
              <FoldersRow
                folders={folders}
                onPress={(folder) => router.push(`/folder/${folder.id}`)}
                onLongPress={showOptions}
                onAddPress={() => setCreatingFolder(true)}
              />
            </View>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.sectionLabel, { color: sectionLabelColor }]}
            >
              Notes
            </ThemedText>
          </View>
        }
      />

      {/* The pinned layer. `box-none` so it only catches taps that land on
          the search bar itself — the title and Notes scrolling underneath
          it stay draggable. */}
      <View style={styles.pinned} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor,
              borderBottomColor: separatorColor,
              // Covers the safe area and the pinned bar, with the same
              // gap below the bar as above it.
              height: searchPinnedY + SEARCH_BAR_HEIGHT + TOP_INSET_GAP,
            },
            backdropStyle,
          ]}
          pointerEvents="none"
        />
        <Animated.View style={[styles.searchWrap, searchStyle]}>
          <SearchBarButton onPress={() => router.push("/search")} />
        </Animated.View>
      </View>

      <AddNoteButton
        onPress={(origin) =>
          router.push({
            pathname: "/note/[id]",
            params: { id: "new", ...toZoomParams(origin) },
          })
        }
      />
      <TextPromptModal
        visible={creatingFolder}
        title="New Folder"
        confirmLabel="Create"
        placeholder="Folder name"
        onCancel={() => setCreatingFolder(false)}
        onSubmit={handleCreateFolder}
      />
      <TextPromptModal
        visible={renamingFolder !== null}
        title="Rename Folder"
        confirmLabel="Save"
        initialValue={renamingFolder?.name ?? ""}
        onCancel={() => setRenamingFolder(null)}
        onSubmit={handleRename}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    gap: HEADER_GAP,
    paddingBottom: 8,
  },
  searchSpacer: {
    height: SEARCH_BAR_HEIGHT,
  },
  foldersSection: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pinned: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  searchWrap: {
    // Matches the list's own horizontal padding so the bar lines up with
    // the Note cards under it rather than sitting a few points off. Lives
    // here rather than on the container so the backdrop below can still
    // span the full width.
    paddingHorizontal: 20,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
