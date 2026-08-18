# 07 — Dictation engine adapter (on-device, seam only)

**What to build:** A thin wrapper interface around `expo-speech-recognition`, configured for on-device recognition (`requiresOnDeviceRecognition`) with `interimResults: true`, exposing start/stop controls and onPartialResult/onFinalResult callbacks. No audio file is ever persisted or exposed by this adapter — only recognized text flows out of it. No editor UI is wired up yet; this ticket proves the seam in isolation.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Adapter exposes a start/stop control surface independent of any specific screen
- [ ] Adapter emits partial (interim) results as speech is recognized, before the user stops speaking
- [ ] Adapter emits a final result when recognition settles on a phrase/segment
- [ ] Adapter is configured for on-device recognition — no network call is made for transcription
- [ ] Adapter never exposes or persists raw audio — only text
- [ ] Test suite drives the adapter's consumer-facing behavior via synthetic partial/final events rather than the real microphone or native module
