import {
  darkEditorCss,
  darkEditorTheme,
  defaultEditorTheme,
  RichText,
  TenTapStartKit,
  Toolbar,
  useEditorBridge,
} from "@10play/tentap-editor";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FolderPickerModal } from "@/components/folder-picker-modal";
import { LoadingView } from "@/components/loading-view";
import {
  SaveStatusIndicator,
  type SaveStatus,
} from "@/components/notes/save-status";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BackButton } from "@/components/ui/back-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useNotesRepository } from "@/db/context";
import { NotFoundError } from "@/db/repository";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePreferences } from "@/hooks/use-preferences";
import { useFolders, useNotesActions, useNotesLoaded, type NotesActions } from "@/hooks/use-notes-store";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  decideAutosave,
  decideOnLeave,
  type AutosaveAction,
  type LeaveAction,
} from "@/lib/notes/autosave";
import { toEditorContent } from "@/lib/notes/rich-text";
import { noteFontSizePx } from "@/lib/preferences";

const AUTOSAVE_DELAY_MS = 400;
// How long the "saved" tick lingers before the header goes quiet again.
const SAVED_INDICATOR_MS = 1600;
// The floating formatting Toolbar's fixed height (set via `editorTheme`
// below).
const TOOLBAR_HEIGHT = 56;

/** Parses the `folderId` route param a new Note is created from (ticket
 * 05) — present and numeric when opened via "+ New Note" from inside a
 * Folder (`/note/new?folderId=…`), absent (→ Unfiled) from "All Notes".
 * Malformed input degrades to Unfiled rather than throwing, same
 * defensive stance as the rest of this screen's route-param handling. */
function parseFolderIdParam(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Executes whichever action `decideAutosave`/`decideOnLeave` decided on.
 * `initialFolderId` only matters for the "create" branch — an existing
 * Note's Folder is changed via `moveNote` (see `handleMove` below), not
 * through this autosave path.
 *
 * Takes the Notes store's write actions rather than the repository
 * directly: these have the same signatures, but each one also folds its
 * result into the shared state, which is what lets Home, Folder-browse,
 * Search, and Tasks show this edit without re-fetching when the user
 * navigates back to them. */
async function applyAction(
  store: NotesActions,
  action: AutosaveAction | LeaveAction,
  onCreated: (id: number) => void,
  initialFolderId: number | null,
): Promise<void> {
  switch (action.type) {
    case "create": {
      let note;
      try {
        note = await store.createNote({
          content: action.content,
          folderId: initialFolderId,
        });
      } catch (error) {
        // The target Folder no longer exists — a stale/malformed `folderId`
        // route param, or a Folder deleted (from another screen) between
        // this screen mounting and the first autosave. Falling back to
        // Unfiled keeps the Note's content instead of losing it: every
        // failed retry here would otherwise repeat forever, since nothing
        // else ever clears `initialFolderId`.
        if (initialFolderId !== null && error instanceof NotFoundError) {
          note = await store.createNote({ content: action.content, folderId: null });
        } else {
          throw error;
        }
      }
      onCreated(note.id);
      return;
    }
    case "update":
      await store.updateNoteContent(action.noteId, action.content);
      return;
    case "delete":
      await store.deleteNote(action.noteId);
      return;
    case "none":
      return;
  }
}

export default function NoteScreen() {
  const { id, folderId: folderIdParam } = useLocalSearchParams<{
    id: string;
    folderId?: string;
  }>();
  const isNewNote = id === "new";
  const numericId = isNewNote ? null : Number(id);
  const repo = useNotesRepository();
  // Writes go through the store so every other screen sees this edit as it
  // happens; the single-Note load below still reads the repository
  // directly, since it needs one row by id rather than the whole library.
  const store = useNotesActions();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Seeds the editor once, the render it first mounts — see the effect
  // below for why that render is guaranteed to already have real content.
  const [initialContent, setInitialContent] = useState("");
  const [loaded, setLoaded] = useState(isNewNote);
  const [loadFailure, setLoadFailure] = useState<"not-found" | "error" | null>(
    null,
  );
  // The Folder this Note is (or, for a still-unsaved new Note, will be)
  // filed under — null means Unfiled. For an existing Note this is
  // populated by the load effect below; for a new Note it's seeded once
  // from the `folderId` route param and only otherwise changes via
  // `handleMove` once the Note is persisted (see the header's Move
  // control, gated on `!isNewNote`).
  const [folderId, setFolderId] = useState<number | null>(() =>
    parseFolderIdParam(folderIdParam),
  );
  // Populates the Move-to-Folder picker (ticket 05), read from the shared
  // store rather than fetched here — a Folder created or renamed on
  // another screen is already in it.
  const folders = useFolders();
  // Distinct from `folders.length === 0`, which is also true for a note
  // that's genuinely Unfiled with no other Folders to move into — without
  // this, the header's Move label would flash "Unfiled" for a filed Note
  // for the brief window before the store's first load has resolved.
  const foldersLoaded = useNotesLoaded();
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  // Mutable, not state: these back the autosave/leave decisions and must
  // reflect the latest value synchronously (from the debounce timer and
  // from the unmount cleanup), not React's next-render value.
  const noteIdRef = useRef<number | null>(null);
  // A new Note's target Folder never changes after this screen mounts
  // (see `folderId` state's own comment) — captured once so the
  // debounced autosave and the unmount-time leave decision, both queued
  // tasks that may run well after the initiating render, use the same
  // value `applyAction`'s "create" branch was always going to see.
  const initialFolderIdRef = useRef(parseFolderIdParam(folderIdParam));
  // Holds the editor's content (a serialized rich-text document — see
  // ADR-0001) as of the last `onChange`, kept in sync via TenTap's async
  // `getJSON()` bridge call rather than a synchronous keystroke handler.
  const contentRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Chains repository writes so a debounced update can never race ahead of
  // the create it depends on (e.g. two edits typed less than one autosave
  // apart, before the first edit's `createNote` has resolved).
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  // Flipped in the unmount cleanup below. Guards `onChange`'s async
  // continuation: reading content back from the editor is an async round
  // trip, so a keystroke typed right before navigating away can still
  // resolve *after* this screen has already left and enqueued its leave
  // decision — without this guard that stray continuation would schedule
  // another autosave behind it, updating (or erroring on) a Note the leave
  // decision may have just deleted.
  const isUnmountedRef = useRef(false);
  // Each `onChange`'s `getJSON()` call is an independent WebView bridge
  // round trip with no inherent ordering guarantee — if an older call's
  // response ever arrived after a newer one's, it would clobber
  // `contentRef` with stale content. Only the response matching the most
  // recently issued call is applied; any other is a superseded straggler.
  const changeSeqRef = useRef(0);

  // `useColorScheme` resolves the user's theme-mode preference against
  // the device scheme (ticket 09) and always returns a concrete scheme, so
  // there's nothing to default here.
  const colorScheme = useColorScheme();
  const { preferences } = usePreferences();
  const placeholderColor = useThemeColor({}, "placeholder");
  const tintColor = useThemeColor({}, "tint");
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceAltColor = useThemeColor({}, "surfaceAlt");
  const navBackgroundColor = useThemeColor({}, "navBackground");
  const navIconInactiveColor = useThemeColor({}, "navIconInactive");
  // `theme` only covers the WebView's own background and the (native,
  // not WebView-rendered) toolbar — both plain RN styles that update live
  // on every render, unlike the CSS below. The note body's own text stays
  // TenTap's default (unthemed) color regardless, so it needs `darkEditorCss`
  // injected into the document too, or dark mode would pair a dark
  // background with equally-dark default text.
  //
  // The base per-scheme theme is restyled (ticket-less UI pass) so the
  // formatting Toolbar reads as the same floating dark pill as the rest of
  // the app's chrome (see components/ui/bottom-nav.tsx) rather than
  // TenTap's default flat white/gray bar — only `webview`'s background
  // (the note body itself) stays scheme-appropriate, light mode picking up
  // this app's cream surface color, dark mode left at TenTap's own dark
  // constant since `darkEditorCss` below hard-codes text/background
  // together and re-deriving both to match this app's exact dark surface
  // isn't worth the risk of a mismatched, hard-to-read pairing.
  // The color the note body itself is painted in: this app's surface in
  // light mode, TenTap's own dark constant in dark (read back off its
  // theme with `flatten` rather than re-typed here, so the two can't
  // drift). The screen behind the editor uses this rather than the app's
  // `background` token, so the header above the editor blends into the
  // page instead of sitting on a visibly different band — the note reads
  // as one continuous sheet, Apple Notes-style, with the back button and
  // Folder pill floating over it.
  const editorSurfaceColor =
    (colorScheme === "dark"
      ? StyleSheet.flatten(darkEditorTheme.webview)?.backgroundColor
      : surfaceColor) ?? surfaceColor;

  const editorTheme = useMemo(() => {
    const base = colorScheme === "dark" ? darkEditorTheme : defaultEditorTheme;
    return {
      ...base,
      webview: colorScheme === "dark" ? base.webview : { backgroundColor: surfaceColor },
      toolbar: {
        ...base.toolbar,
        toolbarBody: [
          base.toolbar.toolbarBody,
          { backgroundColor: navBackgroundColor, borderTopWidth: 0, borderBottomWidth: 0, height: TOOLBAR_HEIGHT },
        ],
        toolbarButton: [base.toolbar.toolbarButton, { backgroundColor: navBackgroundColor }],
        iconWrapper: [base.toolbar.iconWrapper, { backgroundColor: navBackgroundColor, borderRadius: 10 }],
        iconWrapperActive: { backgroundColor: tintColor },
        icon: [base.toolbar.icon, { tintColor: navIconInactiveColor }],
        iconActive: { tintColor: "#FFFFFF" },
      },
    };
  }, [colorScheme, surfaceColor, navBackgroundColor, tintColor, navIconInactiveColor]);
  // TenTap's editor document has no inset of its own — text runs flush to
  // the WebView's edges without this. Targets `.ProseMirror` (the editable
  // element itself) rather than `body`, and only sets individual
  // left/right/top properties rather than the `padding` shorthand, so it
  // can't clobber `RichText`'s own `paddingBottom` (set directly via
  // inline style, to grow when the keyboard is up — see
  // node_modules/@10play/tentap-editor's RichText.tsx).
  // Note body text size (ticket 09) rides the same CSS-injection path as
  // the editor's colors rather than being an RN style: the note body is a
  // ProseMirror document inside a WebView, and no React Native style
  // reaches inside it. Set on `.ProseMirror` itself so headings — sized in
  // `em` by the WebView's own defaults — scale with the body rather than
  // staying put while the paragraphs around them move.
  const editorContentCSS = `
    .ProseMirror {
      padding-left: 20px;
      padding-right: 20px;
      padding-top: 16px;
      font-size: ${noteFontSizePx(preferences.noteTextSize)}px;
    }
  `;
  const editorBodyCSS = `${editorContentCSS}${colorScheme === "dark" ? darkEditorCss : ""}`;
  const placeholderCSS = `
    .is-editor-empty:first-child::before {
      color: ${placeholderColor};
      content: attr(data-placeholder);
      float: left;
      height: 0;
      pointer-events: none;
    }
  `;
  // TenTap's StarterKit ships a placeholder extension but no built-in way
  // to set its text/color via `useEditorBridge`'s options — it has to be
  // configured on the bridge extension itself, matching ticket 03's
  // "Start typing…" placeholder and its themed color token. `coreBridge`
  // is always present too, so it doubles as a place to bake in the note
  // body's dark-mode CSS for the same reason: without it, the very first
  // paint of a dark-mode Note would show default (unthemed) text against
  // the already-dark `theme.webview` background until the `injectCSS`
  // effects below catch up. Both are only correct for the color scheme at
  // the moment the WebView loads; those effects handle later changes.
  const bridgeExtensions = useMemo(
    () =>
      TenTapStartKit.map((extension) => {
        if (extension.name === "placeholder") {
          return extension
            .configureExtension({ placeholder: "Start typing…" })
            .configureCSS(placeholderCSS);
        }
        if (extension.name === "coreBridge") {
          return extension.configureCSS(editorBodyCSS);
        }
        return extension;
      }),
    // Only the values the WebView loads with need to be current here;
    // later changes are handled by re-injecting CSS below, not by
    // rebuilding the bridge extensions (which would tear down and reload
    // the WebView).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const enqueueSave = useCallback((run: () => Promise<void>) => {
    pendingSavesRef.current += 1;
    let failed = false;
    saveChainRef.current = saveChainRef.current
      .then(run)
      .catch((error) => {
        console.error("Note autosave failed", error);
        failed = true;
      })
      .finally(() => {
        pendingSavesRef.current -= 1;
        // The leave decision is queued from the unmount cleanup, so the
        // last link in this chain routinely settles after this screen is
        // gone — there's no state left to report it to.
        if (isUnmountedRef.current) return;
        if (failed) {
          setSaveStatus("failed");
        } else if (pendingSavesRef.current === 0) {
          setSaveStatus("saved");
        }
      });
  }, []);

  const scheduleSave = useCallback(() => {
    setSaveStatus("saving");
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      // Deferred until the chain actually runs this task, so it reads
      // whatever noteIdRef looks like *then* — not at schedule time.
      enqueueSave(() =>
        applyAction(
          store,
          decideAutosave({ noteId: noteIdRef.current }, contentRef.current),
          (id) => {
            noteIdRef.current = id;
          },
          initialFolderIdRef.current,
        ),
      );
    }, AUTOSAVE_DELAY_MS);
  }, [enqueueSave, store]);

  // `useEditorBridge` only ever consumes `initialContent` once, at the
  // render RichText first mounts (see `initialContent` state's own
  // comment) — memoized so later re-renders (a colorScheme flip, an
  // `editorLoadGeneration` bump) don't re-parse the whole document for a
  // value nothing downstream will look at again.
  const editorInitialContent = useMemo(
    () => toEditorContent(initialContent),
    [initialContent],
  );

  const editor = useEditorBridge({
    autofocus: isNewNote,
    avoidIosKeyboard: true,
    bridgeExtensions,
    initialContent: editorInitialContent,
    theme: editorTheme,
    onChange: () => {
      // `onChange` only fires from TenTap's own content-changed event (not
      // selection/focus updates), so this mirrors ticket 03's
      // `onChangeText` — one difference: reading the new content back is
      // an async round trip through the editor's WebView bridge, not a
      // value handed to us synchronously.
      const seq = ++changeSeqRef.current;
      editor
        .getJSON()
        .then((json) => {
          if (isUnmountedRef.current) return;
          // A slower, older call resolving after a newer one would
          // otherwise clobber it with stale content — see changeSeqRef's
          // declaration above.
          if (seq !== changeSeqRef.current) return;
          contentRef.current = JSON.stringify(json);
          scheduleSave();
        })
        .catch((error) => {
          if (isUnmountedRef.current) return;
          console.error("Failed to read Note content", error);
        });
    },
  });
  // `editor` is a plain object TenTap rebuilds on every render (not
  // memoized) — reading it from a `useEffect` dependency array would fire
  // that effect's cleanup on every render, not just on unmount. The leave
  // effect below needs the *latest* editor without depending on it, so it
  // reads this ref instead; assigning during render (rather than in its
  // own effect) keeps it current before that effect's cleanup could ever
  // run for this render.
  const editorRef = useRef(editor);
  editorRef.current = editor;

  // `injectCSS` silently no-ops until the WebView has actually finished
  // its own (internal) page load — for an existing Note, that's a render
  // *after* this component's own `loaded` flips true (RichText doesn't
  // even mount, let alone finish loading, before then), so gate the two
  // effects below on RichText's `onLoad` rather than firing them
  // unconditionally on mount; otherwise the very first, correctness-
  // critical injection is silently dropped for every existing Note.
  //
  // A counter, not a one-shot boolean: on iOS, TenTap's `RichText`
  // deliberately remounts the WebView once right after its first load (a
  // documented workaround), firing `onLoad` a second time for a *new*
  // native view with its own fresh (unstyled) page — a boolean that only
  // ever flips false→true would miss injecting into that second, actually
  // final instance. Each `onLoad` bumps the counter so both effects re-run
  // every time, including for that second load.
  const [editorLoadGeneration, setEditorLoadGeneration] = useState(0);
  const hasEditorLoadedOnce = editorLoadGeneration > 0;

  // The floating toolbar sits clear of the home indicator when it's
  // resting at the bottom of the screen — but with the keyboard up, the
  // keyboard already covers that strip, and keeping the inset would leave
  // a band of empty background between the bar and the keyboard's top
  // edge. iOS gets the `will` events so the bar's margin changes on the
  // same beat as `KeyboardAvoidingView`'s padding animation; Android only
  // has the `did` pair.
  // There is no Save button — edits land via the debounced autosave below
  // — so this is the only signal the user gets that their typing reached
  // disk. `saving` is set the moment an edit is registered (not when the
  // write finally starts), so the indicator covers the debounce window
  // too: from the user's side that whole stretch is "not saved yet".
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  // Counts writes queued but not yet settled, so the status only falls
  // back to `saved` once the chain has actually drained — with a second
  // edit chained behind the first, the first one finishing doesn't mean
  // the Note is up to date.
  const pendingSavesRef = useRef(0);

  // `saved` is an acknowledgement, not a state worth keeping on screen —
  // it clears itself so the header goes quiet again while the user reads
  // what they wrote. `failed` deliberately doesn't (see save-status.tsx).
  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timer = setTimeout(() => setSaveStatus("idle"), SAVED_INDICATOR_MS);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const isIOS = Platform.OS === "ios";
    const shown = Keyboard.addListener(isIOS ? "keyboardWillShow" : "keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hidden = Keyboard.addListener(isIOS ? "keyboardWillHide" : "keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  // `bridgeExtensions`' baked-in CSS only takes effect for the WebView's
  // initial load (react-native-webview doesn't re-run injectedJavaScript
  // on prop changes) — if the OS theme changes while this screen stays
  // mounted, re-inject the placeholder CSS directly so its color doesn't
  // go stale.
  useEffect(() => {
    if (!hasEditorLoadedOnce) return;
    editorRef.current.injectCSS(placeholderCSS, "placeholder-theme");
  }, [placeholderCSS, editorLoadGeneration, hasEditorLoadedOnce]);
  // Same reasoning as above, for the note body's own text/background —
  // `bridgeExtensions` only bakes the placeholder's CSS at load time, and
  // `theme` (passed to `useEditorBridge` above) only reaches the RN-styled
  // webview container and toolbar, not the ProseMirror document itself.
  useEffect(() => {
    if (!hasEditorLoadedOnce) return;
    editorRef.current.injectCSS(editorBodyCSS, "editor-body-theme");
  }, [editorBodyCSS, editorLoadGeneration, hasEditorLoadedOnce]);

  useEffect(() => {
    if (isNewNote || numericId === null) {
      return;
    }
    if (!Number.isFinite(numericId)) {
      setLoadFailure("not-found");
      return;
    }

    let cancelled = false;
    setLoadFailure(null);

    repo
      .getNote(numericId)
      .then((note) => {
        if (cancelled) return;
        if (!note) {
          setLoadFailure("not-found");
          return;
        }
        noteIdRef.current = note.id;
        contentRef.current = note.content;
        // Batched with `setLoaded` below, so the first render where
        // `loaded` is true — the one that actually mounts the editor — is
        // also the one where `initialContent` already reflects this Note,
        // not the empty string it started as.
        setInitialContent(note.content);
        setFolderId(note.folderId);
        setLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load note", error);
        setLoadFailure("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isNewNote, numericId, repo]);

  // Moves this (already-persisted) Note to a different Folder, or back to
  // Unfiled — a direct, immediate repository call rather than something
  // routed through the autosave/leave decisions above, since it's not a
  // content edit and shouldn't wait on the debounce.
  const handleMove = useCallback(
    async (newFolderId: number | null) => {
      const noteId = noteIdRef.current;
      if (noteId === null) return;
      try {
        await store.moveNote(noteId, newFolderId);
        setFolderId(newFolderId);
      } catch (error) {
        console.error("Failed to move note", error);
        Alert.alert("Couldn't move this Note", "Please try again.");
      } finally {
        setShowFolderPicker(false);
      }
    },
    [store],
  );

  // Runs once, on navigating away from this Note: flushes whatever the
  // debounce timer hasn't saved yet, or — if the Note is left with no
  // content — discards it (never persisted it if it never had content;
  // deletes it if it did and got typed back down to nothing).
  //
  // The leave decision is computed lazily, inside the queued task below,
  // not eagerly here — a debounced autosave may already be chained ahead
  // of it and still in flight, and only running `decideOnLeave` after that
  // task has actually resolved (and updated noteIdRef) guarantees this
  // sees the real state instead of racing it into a duplicate create.
  //
  // `contentRef` is the best available source at this point — reading the
  // editor fresh here isn't an option: React detaches the WebView's ref
  // synchronously as part of the same commit that unmounts this screen,
  // strictly before this cleanup (a passive effect) ever runs, so by now
  // `editor.getJSON()` can only ever time out (TenTap's bridge silently
  // no-ops once its WebView ref is gone). A keystroke whose `onChange`
  // round trip is still in flight when the user navigates away can
  // therefore be lost — an inherent limit of bridging to a WebView-hosted
  // editor across an unmount, not something to paper over with a doomed
  // "read one more time" attempt.
  useEffect(() => {
    // Copied out of the ref here, at effect-setup time, rather than read
    // from `initialFolderIdRef.current` down in the cleanup below: the ref
    // itself never actually changes after mount (see its own comment), but
    // the lint rule can't know that, and this reads the same either way.
    const initialFolderId = initialFolderIdRef.current;
    return () => {
      isUnmountedRef.current = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      enqueueSave(() =>
        applyAction(
          store,
          decideOnLeave({ noteId: noteIdRef.current }, contentRef.current),
          (id) => {
            noteIdRef.current = id;
          },
          initialFolderId,
        ),
      );
    };
    // `enqueueSave` and `store` are stable for the screen's lifetime —
    // this is intentionally an unmount-only cleanup, not a re-run trigger.
  }, [enqueueSave, store]);

  if (loadFailure === "not-found") {
    return (
      <ThemedView style={styles.flex}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <BackButton onPress={() => router.back()} />
        </View>
        <ThemedView style={styles.centered}>
          <ThemedText>This Note no longer exists.</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (loadFailure === "error") {
    return (
      <ThemedView style={styles.flex}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <BackButton onPress={() => router.back()} />
        </View>
        <ThemedView style={styles.centered}>
          <ThemedText>
            Couldn&apos;t load this Note. Go back and try again.
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (!loaded) {
    return <LoadingView />;
  }

  // Only an already-persisted Note can be moved (see `folderId` state's
  // own comment) — a brand new Note's Folder is fixed at creation time by
  // the `folderId` route param, not something this screen offers to
  // change before it even exists. Also withheld until `foldersLoaded`, so
  // a filed Note never flashes "Unfiled" before its real Folder's name has
  // loaded (see that state's own comment).
  const currentFolderLabel =
    isNewNote || !foldersLoaded
      ? null
      : (folders.find((folder) => folder.id === folderId)?.name ?? "Unfiled");

  return (
    <ThemedView style={[styles.flex, { backgroundColor: editorSurfaceColor }]}>
      {/* Replaces the native Stack header (ticket-less UI pass): a
          floating back button, the autosave indicator, plus — once an
          already-persisted Note's Folder is known (see
          `currentFolderLabel` above) — a pill showing it that opens the
          same Move-to-Folder picker the native header's text link used
          to.

          No background of its own: it sits directly on the same color as
          the note body (see `editorSurfaceColor`). Its controls take
          `surfaceAlt` rather than the usual `surface`, which is now the
          page behind them and would leave them invisible but for their
          shadows. */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton
          onPress={() => router.back()}
          backgroundColor={surfaceAltColor}
        />
        <View style={styles.headerRight}>
          <SaveStatusIndicator status={saveStatus} />
          {currentFolderLabel !== null && (
            <Pressable
              onPress={() => setShowFolderPicker(true)}
              style={[styles.folderPill, { backgroundColor: surfaceAltColor }]}
              hitSlop={8}
              accessibilityRole="button"
            >
              <IconSymbol name="folder.fill" size={14} color={tintColor} />
              <ThemedText
                type="defaultSemiBold"
                style={styles.folderPillLabel}
                numberOfLines={1}
              >
                {currentFolderLabel}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
      <RichText
        editor={editor}
        onLoad={() => setEditorLoadGeneration((n) => n + 1)}
      />
      {/* A WebView (RichText, above) is a native view with its own
          asynchronous layout — sizing it via `flex: 1` against a sibling
          Toolbar inside the same KeyboardAvoidingView collapsed the
          Toolbar's height entirely (tried it; the Toolbar rendered as a
          sliver with no icons). Absolute-positioned and overlaid on top of
          RichText instead, same as before this pass: RichText already
          fills the full screen underneath it. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.toolbarContainer}
      >
        {/* Floats free of the bottom edge, like the rest of the app's
            chrome (components/ui/bottom-nav.tsx) and like Apple Notes'
            own formatting bar, rather than sitting flush as an attached
            sheet.

            A rounded rectangle, not a capsule: the Toolbar's ~11
            formatting icons (bold/italic/link/checklist/heading/underline/
            lists/indent/outdent/undo/redo) already scroll horizontally on
            most phones, and the 20pt side margins take another icon's
            worth of width — a fully-rounded 28pt radius would then clip
            the leading and trailing icons mid-shape against the curve
            instead of reading as "there's more to scroll to". At 18 the
            corners stay clear of the icon row. */}
        <View
          style={[
            styles.floatingToolbar,
            {
              backgroundColor: navBackgroundColor,
              marginBottom: keyboardVisible ? 12 : insets.bottom + 12,
            },
          ]}
        >
          {/* `hidden={false}` is load-bearing, not a default spelled out:
              TenTap resolves an *omitted* `hidden` to
              `!isKeyboardUp || !editorState.isFocused` and applies
              `display: 'none'` — so without this the bar vanishes the
              instant the keyboard closes (and never appears at all when
              opening an existing Note, which doesn't autofocus), with no
              way short of tapping back into the text to bring it back.
              The pill around it has no intrinsic height, so it collapses
              with it. Passing false pins the bar on screen the way the
              rest of the app's floating chrome is. */}
          <Toolbar editor={editor} hidden={false} />
        </View>
      </KeyboardAvoidingView>
      <FolderPickerModal
        visible={showFolderPicker}
        folders={folders}
        currentFolderId={folderId}
        onCancel={() => setShowFolderPicker(false)}
        onSelect={handleMove}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  folderPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    maxWidth: 180,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  folderPillLabel: {
    fontSize: 14,
  },
  toolbarContainer: {
    position: "absolute",
    width: "100%",
    bottom: 0,
  },
  floatingToolbar: {
    // Same geometry as the bottom nav's pill — 20pt side margins, and a
    // shadow cast downward now that the bar has an edge below it rather
    // than being anchored to the screen's.
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
