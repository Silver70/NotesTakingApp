import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import "react-native-reanimated";

import { NotesStoreProvider } from "@/components/notes-store-provider";
import { PreferencesProvider } from "@/components/preferences-provider";
import { DatabaseProvider } from "@/db/context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function RootLayout() {
  // `DatabaseProvider` outermost: both stores below read through
  // repositories it opens, so it has to resolve first. `PreferencesProvider`
  // next, because everything themed sits inside it — including the
  // navigation theme below, which is why the app shell is its own
  // component rather than this one. `NotesStoreProvider` innermost: it
  // holds the app's Notes and Folders and needs neither of the other two,
  // but its own loading state is themed.
  return (
    <DatabaseProvider>
      <PreferencesProvider>
        <NotesStoreProvider>
          <AppShell />
        </NotesStoreProvider>
      </PreferencesProvider>
    </DatabaseProvider>
  );
}

function AppShell() {
  const colorScheme = useColorScheme();
  const accent = useThemeColor({}, "tint");

  // React Navigation's own theme is only lightly visible here (every
  // screen draws its own chrome), but it still backs screen transitions
  // and defaults — so it follows the user's theme-mode preference through
  // `useColorScheme` like everything else, and takes the chosen accent as
  // its `primary` rather than React Navigation's stock blue.
  const navigationTheme = useMemo(() => {
    const base = colorScheme === "dark" ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, primary: accent } };
  }, [colorScheme, accent]);

  return (
    <ThemeProvider value={navigationTheme}>
      {/* Every screen draws its own header (ticket-less UI pass) — see
          e.g. components/ui/back-button.tsx — so the native Stack header
          is off by default here rather than per-screen.

          Only two entries: the tab navigator holding the app's three
          destinations, and the Note editor, which sits *outside* it. The
          editor is pushed over the tabs rather than inside one because it
          replaces the bottom chrome entirely with its own back button and
          formatting toolbar, and is reachable from every tab. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="note/[id]" options={{ title: "Note" }} />
      </Stack>
      {/* Not `style="auto"`: that follows the *device* scheme, which is
          the one thing a user picking Light or Dark explicitly is
          overriding — it would leave the status bar dark-on-dark whenever
          their choice disagrees with the OS. */}
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
