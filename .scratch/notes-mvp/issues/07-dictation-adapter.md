# 07 — Dictation engine adapter (on-device, seam only)

**What to build:** A thin wrapper interface around `expo-speech-recognition`, configured for on-device recognition (`requiresOnDeviceRecognition`) with `interimResults: true`, exposing start/stop controls and onPartialResult/onFinalResult callbacks. No audio file is ever persisted or exposed by this adapter — only recognized text flows out of it. No editor UI is wired up yet; this ticket proves the seam in isolation.

**Blocked by:** 01

**Status:** done

- [x] Adapter exposes a start/stop control surface independent of any specific screen
- [x] Adapter emits partial (interim) results as speech is recognized, before the user stops speaking
- [x] Adapter emits a final result when recognition settles on a phrase/segment
- [x] Adapter is configured for on-device recognition — no network call is made for transcription
- [x] Adapter never exposes or persists raw audio — only text
- [x] Test suite drives the adapter's consumer-facing behavior via synthetic partial/final events rather than the real microphone or native module

## Comments

Implemented in `lib/dictation/dictation-adapter.ts`, `lib/dictation/native-engine.ts`, and `lib/dictation/__tests__/dictation-adapter.test.ts`, commit follows.

- Mirrors the `db/repository.ts`/`db/client.ts` split: `dictation-adapter.ts` is the driver-agnostic seam (`DictationEngine` — the minimal slice of `ExpoSpeechRecognitionModule` it needs — plus `createDictationAdapter`), and `native-engine.ts` is the one file that imports the real `ExpoSpeechRecognitionModule`. Confirmed by direct test that importing `expo-speech-recognition` under Jest throws ("Cannot find native module 'ExpoSpeechRecognition'") — so keeping the real module out of any file the tests import is load-bearing, not just tidy.
- `start()` hardcodes `requiresOnDeviceRecognition: true`, `interimResults: true`, `maxAlternatives: 1`, and leaves `recordingOptions`/`audioSource` unset (their absence is what keeps the engine from ever writing an audio file).
- `DictationEngine`'s `addListener` is only typed for the `result` (and, see below, `error`) events — `audiostart`/`audioend` aren't reachable through the interface at all, so "this adapter cannot read raw audio" is a compile-time property, not just a runtime habit.
- 12 tests drive `createDictationAdapter` against a fake `DictationEngine` that dispatches synthetic `result`/`error` events — no real microphone or native module involved, per the testing decision in spec.md.
- Hardening found via `/code-review` before committing: two independent review passes flagged that the adapter had no way to surface a failed `start()` (denied mic/speech permission, no on-device recognizer available) — silently "listening" forever with no partial/final result and no signal to a future consumer. Added `onError`/`DictationError` to the seam, wired to the native module's `error` event, with matching test coverage. Everything else raised by review was pre-existing code from earlier tickets, out of scope here.
