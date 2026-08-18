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
        <Stack>
          <Stack.Screen name="index" options={{ title: "All Notes" }} />
          <Stack.Screen name="note/[id]" options={{ title: "" }} />
        </Stack>
      </DatabaseProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
