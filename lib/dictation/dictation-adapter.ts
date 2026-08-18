import type { ExpoSpeechRecognitionNativeEventMap, ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';

/**
 * The Dictation engine adapter (ticket 07, spec.md "Seams"). A thin
 * wrapper around `expo-speech-recognition` exposing only start/stop and
 * partial/final result callbacks — see CONTEXT.md ("Dictation"): recognized
 * text flows out, raw audio never does. No editor is wired to this yet
 * (ticket 08); this file proves the seam in isolation.
 *
 * `DictationEngine` is the minimal slice of `ExpoSpeechRecognitionModule`
 * this adapter drives, mirroring `db/repository.ts`'s `Database` type: it
 * lets `createDictationAdapter` stay ignorant of which concrete module it's
 * given, so tests can hand it a fake that emits synthetic events instead of
 * the real native module (which cannot run under Jest — see
 * `native-engine.ts`). Declaring only `result`/`error` here — no
 * `audiostart`/`audioend` — makes "this adapter cannot read raw audio" a
 * compile-time property, not just a runtime habit.
 *
 * `error` is included alongside `result` (even though the ticket's
 * checklist only calls out partial/final results) because `start()` can
 * fail asynchronously in ways only that event reports — denied
 * microphone/speech permission, or no on-device recognizer available for
 * `requiresOnDeviceRecognition` (see `RECOGNITION_OPTIONS`) — and without
 * it a consumer has no way to tell "still listening" apart from "silently
 * never going to produce a result."
 */
export interface DictationEngine {
  start(options: ExpoSpeechRecognitionOptions): void;
  stop(): void;
  addListener(
    eventName: 'result',
    listener: (event: ExpoSpeechRecognitionNativeEventMap['result']) => void,
  ): { remove(): void };
  addListener(
    eventName: 'error',
    listener: (event: ExpoSpeechRecognitionNativeEventMap['error']) => void,
  ): { remove(): void };
}

/** What a consumer gets on each partial/final update — text only. */
export type DictationResult = { transcript: string };
export type DictationResultListener = (result: DictationResult) => void;

/** Why a Dictation session failed to start or was cut short. */
export type DictationError = { code: string; message: string };
export type DictationErrorListener = (error: DictationError) => void;

/** Unsubscribes a listener registered via `onPartialResult`/`onFinalResult`/`onError`. */
export type DictationUnsubscribe = () => void;

export interface DictationAdapter {
  /** Begins listening. Independent of any screen — callers own when/why. */
  start(): void;
  /** Stops listening; the engine settles any in-flight result as final. */
  stop(): void;
  /** Fires for each interim result, before the user stops speaking. */
  onPartialResult(listener: DictationResultListener): DictationUnsubscribe;
  /** Fires once recognition settles on a final phrase/segment. */
  onFinalResult(listener: DictationResultListener): DictationUnsubscribe;
  /** Fires when the engine reports it can't (or can no longer) recognize speech. */
  onError(listener: DictationErrorListener): DictationUnsubscribe;
}

/**
 * On-device only (`requiresOnDeviceRecognition`), so no audio ever leaves
 * the device for transcription — see spec.md's "Voice dictation engine"
 * decision. `interimResults` is what makes partial results exist at all.
 * `maxAlternatives: 1` keeps the engine from doing extra work for
 * alternate transcriptions this adapter never reads (see `results[0]`
 * below). `recordingOptions` is deliberately left unset — its default
 * (`persist: false`) is what keeps this adapter from ever producing an
 * audio file.
 */
const RECOGNITION_OPTIONS: ExpoSpeechRecognitionOptions = {
  interimResults: true,
  requiresOnDeviceRecognition: true,
  maxAlternatives: 1,
};

/** Builds a Dictation adapter over any conforming engine. */
export function createDictationAdapter(engine: DictationEngine): DictationAdapter {
  function onResult(wantFinal: boolean, listener: DictationResultListener): DictationUnsubscribe {
    const subscription = engine.addListener('result', (event) => {
      if (event.isFinal !== wantFinal) return;
      // Only the top transcript ever reaches a consumer — confidence,
      // segments, and every other field on the native result stay here.
      // `!== undefined`, not a truthiness check: a settled utterance can
      // legitimately produce a final result whose transcript is `''` (e.g.
      // recognized-then-retracted speech), which a consumer (ticket 08)
      // needs delivered — a truthiness check would silently drop it,
      // leaving that consumer's own "what's already been written" bookkeeping
      // one result stale.
      const transcript = event.results[0]?.transcript;
      if (transcript !== undefined) {
        listener({ transcript });
      }
    });
    return () => subscription.remove();
  }

  return {
    start() {
      engine.start(RECOGNITION_OPTIONS);
    },
    stop() {
      engine.stop();
    },
    onPartialResult(listener) {
      return onResult(false, listener);
    },
    onFinalResult(listener) {
      return onResult(true, listener);
    },
    onError(listener) {
      const subscription = engine.addListener('error', (event) => {
        listener({ code: event.error, message: event.message });
      });
      return () => subscription.remove();
    },
  };
}
