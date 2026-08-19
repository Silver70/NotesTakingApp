import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import "react-native-reanimated";

import { PreferencesProvider } from "@/components/preferences-provider";
import { DatabaseProvider } from "@/db/context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function RootLayout() {
  // `DatabaseProvider` outermost: preferences are stored in the same
  // database as Notes (ticket 09), so the settings repository has to exist
  // before anything can read a preference. Everything themed then sits
  // inside `PreferencesProvider` — including the navigation theme below,
  // which is why the app shell is its own component rather than this one.
  return (
    <DatabaseProvider>
      <PreferencesProvider>
        <AppShell />
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
      {/* Every screen now draws its own header (ticket-less UI pass) —
          see e.g. components/ui/back-button.tsx — so the native Stack
          header is off by default here rather than per-screen. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "Notes" }} />
        <Stack.Screen name="folder/[id]" options={{ title: "Folder" }} />
        <Stack.Screen name="note/[id]" options={{ title: "Note" }} />
        <Stack.Screen name="search" options={{ title: "Search" }} />
        <Stack.Screen name="tasks" options={{ title: "Tasks" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
      {/* Not `style="auto"`: that follows the *device* scheme, which is
          the one thing a user picking Light or Dark explicitly is
          overriding — it would leave the status bar dark-on-dark whenever
          their choice disagrees with the OS. */}
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
