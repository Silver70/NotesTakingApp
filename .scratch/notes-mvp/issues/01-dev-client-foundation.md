# 01 — Dev Client foundation (iOS + Android)

**What to build:** A custom Expo Dev Client that builds and launches on both iOS and Android, with the config plugins for the native modules this MVP depends on (`@10play/tentap-editor`, `expo-speech-recognition`) registered ahead of time, so later tickets don't hit native-module/config-plugin surprises mid-slice. There is no app-visible behavior beyond the default template screen at this point — this ticket is verified by the dev client building and launching successfully, not by any user-facing feature.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `expo prebuild` (or equivalent) runs cleanly and produces native iOS and Android projects
- [ ] `expo run:ios` launches the custom dev client on an iOS simulator or device
- [ ] `expo run:android` launches the custom dev client on an Android emulator or device
- [ ] Config plugins for `@10play/tentap-editor` and `expo-speech-recognition` are installed and present in `app.json`/`app.config`, even though neither is used by app code yet
- [ ] Plain Expo Go is no longer expected to run this app (documented, e.g. in the README) since native modules are now in play
