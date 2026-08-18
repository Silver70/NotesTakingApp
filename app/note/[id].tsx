import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
} from "react-native";

import { LoadingView } from "@/components/loading-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useNotesRepository } from "@/db/context";
import type { NotesRepository } from "@/db/repository";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  decideAutosave,
  decideOnLeave,
  type AutosaveAction,
  type LeaveAction,
} from "@/lib/notes/autosave";

const AUTOSAVE_DELAY_MS = 400;

/** Executes whichever action `decideAutosave`/`decideOnLeave` decided on. */
async function applyAction(
  repo: NotesRepository,
  action: AutosaveAction | LeaveAction,
  onCreated: (id: number) => void,
): Promise<void> {
  switch (action.type) {
    case "create": {
      const note = await repo.createNote({ content: action.content });
      onCreated(note.id);
      return;
    }
    case "update":
      await repo.updateNoteContent(action.noteId, action.content);
      return;
    case "delete":
      await repo.deleteNote(action.noteId);
      return;
    case "none":
      return;
  }
}

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNewNote = id === "new";
  const numericId = isNewNote ? null : Number(id);
  const repo = useNotesRepository();

  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(isNewNote);
  const [loadFailure, setLoadFailure] = useState<"not-found" | "error" | null>(
    null,
  );

  // Mutable, not state: these back the autosave/leave decisions and must
  // reflect the latest value synchronously (from the debounce timer and
  // from the unmount cleanup), not React's next-render value.
  const noteIdRef = useRef<number | null>(null);
  const contentRef = useRef("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Chains repository writes so a debounced update can never race ahead of
  // the create it depends on (e.g. two edits typed less than one autosave
  // apart, before the first edit's `createNote` has resolved).
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  const textColor = useThemeColor({}, "text");
  const placeholderColor = useThemeColor({}, "placeholder");

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
        setContent(note.content);
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

  const enqueueSave = useCallback((run: () => Promise<void>) => {
    saveChainRef.current = saveChainRef.current.then(run).catch((error) => {
      console.error("Note autosave failed", error);
    });
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      setContent(text);
      contentRef.current = text;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        // Deferred until the chain actually runs this task, so it reads
        // whatever noteIdRef looks like *then* — not at schedule time.
        enqueueSave(() =>
          applyAction(
            repo,
            decideAutosave({ noteId: noteIdRef.current }, text),
            (id) => {
              noteIdRef.current = id;
            },
          ),
        );
      }, AUTOSAVE_DELAY_MS);
    },
    [enqueueSave, repo],
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
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      const finalContent = contentRef.current;
      enqueueSave(() =>
        applyAction(
          repo,
          decideOnLeave({ noteId: noteIdRef.current }, finalContent),
          (id) => {
            noteIdRef.current = id;
          },
        ),
      );
    };
    // `enqueueSave` and `repo` are stable for the screen's lifetime — this
    // is intentionally an unmount-only cleanup, not a re-run trigger.
  }, [enqueueSave, repo]);

  if (loadFailure === "not-found") {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>This Note no longer exists.</ThemedText>
      </ThemedView>
    );
  }

  if (loadFailure === "error") {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Couldn&apos;t load this Note. Go back and try again.</ThemedText>
      </ThemedView>
    );
  }

  if (!loaded) {
    return <LoadingView />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ThemedView style={styles.flex}>
        <TextInput
          value={content}
          onChangeText={handleChangeText}
          multiline
          autoFocus={isNewNote}
          placeholder="Start typing…"
          placeholderTextColor={placeholderColor}
          style={[styles.input, { color: textColor }]}
          textAlignVertical="top"
        />
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
