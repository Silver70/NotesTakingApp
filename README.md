# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## ⚠️ Requires a custom Dev Client — Expo Go will not work

This app depends on native modules (`@10play/tentap-editor` for rich-text
editing, `expo-speech-recognition` for on-device dictation) that aren't
available in the plain Expo Go sandbox. You must build and run a
[custom Expo Dev Client](https://docs.expo.dev/develop/development-builds/introduction/)
instead — see [Get started](#get-started) below.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Generate the native iOS/Android projects

   ```bash
   npx expo prebuild
   ```

   This is required at least once, and again any time native config
   (`app.json` plugins, native dependencies) changes. `ios/` and `android/`
   are gitignored — they're regenerated, not hand-edited.

3. Build and launch the custom dev client

   ```bash
   npx expo run:ios      # requires Xcode + CocoaPods
   npx expo run:android  # requires Android Studio/SDK + a JDK
   ```

   Each command builds the native app and installs it on a connected
   simulator/emulator or device, then starts Metro. On subsequent runs
   (once the dev client is installed), `npx expo start` reconnects Metro to
   the already-installed dev client — no need to rebuild natively every time
   unless native config changed again.

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
