import { Stack } from "expo-router";

/**
 * The Home tab's own history: the Notes list, plus the two screens the
 * user browses *out of* it — a single Folder, and global Search.
 *
 * Both were peers of Home on one flat Stack before tabs, which meant
 * browsing into a Folder and then switching to Tasks and back lost that
 * Folder. Nesting them here scopes that history to the tab: Home
 * remembers where the user was, and backing out of a Folder returns to
 * the Notes list rather than to whichever screen happened to precede it.
 */
export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Notes" }} />
      <Stack.Screen name="folder/[id]" options={{ title: "Folder" }} />
      <Stack.Screen name="search" options={{ title: "Search" }} />
    </Stack>
  );
}
