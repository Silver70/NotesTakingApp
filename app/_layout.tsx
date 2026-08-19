import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { DatabaseProvider } from "@/db/context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        {/* Every screen now draws its own header (ticket-less UI pass) —
            see e.g. components/ui/back-button.tsx — so the native Stack
            header is off by default here rather than per-screen. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ title: "Notes" }} />
          <Stack.Screen name="folder/[id]" options={{ title: "Folder" }} />
          <Stack.Screen name="note/[id]" options={{ title: "Note" }} />
          <Stack.Screen name="search" options={{ title: "Search" }} />
          <Stack.Screen name="tasks" options={{ title: "Tasks" }} />
        </Stack>
      </DatabaseProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
