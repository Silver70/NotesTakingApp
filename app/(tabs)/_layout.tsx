import { Tabs } from "expo-router";

import { NavPill } from "@/components/ui/nav-pill";

/**
 * The app's three peer destinations — Home, Tasks, Settings — as actual
 * tabs, drawn by the floating pill in components/ui/nav-pill.tsx rather
 * than by a stock tab bar.
 *
 * Was a plain Stack that each screen navigated with `router.push`, which
 * treated three peers as a history: Home → Tasks → Settings left three
 * screens deep, the back gesture retraced every switch, and each visit
 * re-mounted its screen. Tabs give each destination one instance that
 * keeps its own scroll position and its own nested history.
 *
 * `NavPill` positions itself absolutely, so it occupies no layout height
 * and the screens below it get the full frame — it floats over content
 * the way the editor's toolbar does, and every list in the app already
 * reserves the space with a fixed bottom inset (see
 * components/notes-list.tsx). `tabBarStyle: { display: 'none' }` isn't
 * hiding a second bar — a custom `tabBar` replaces the stock one outright
 * and never reads that style. It only zeroes the height the navigator
 * reports through `BottomTabBarHeightContext`, which would otherwise be a
 * stock-bar estimate this app's bar doesn't match.
 *
 * The Note editor is deliberately outside this navigator (app/note/[id].tsx,
 * pushed from the root Stack): it has its own floating back/toolbar chrome
 * and shows no bottom nav at all.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <NavPill {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
    >
      {/* Home is a group, not a single screen: Folder-browse and Search
          are pushed *within* it (app/(tabs)/(home)/_layout.tsx), so they
          keep the tab bar, leave Home lit, and pop back to Home rather
          than out of the app. */}
      <Tabs.Screen name="(home)" options={{ title: "Notes" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
