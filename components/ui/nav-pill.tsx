import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export type NavSection = "home" | "tasks" | "settings";

/** The icon and label for each tab, keyed by the route name its file gives
 * it. Adding a destination is one entry here plus one file under
 * `app/(tabs)/` — the pill renders whatever the navigator hands it, in the
 * navigator's own order, so there is no second list to keep in step. */
const DESTINATIONS: Record<
  string,
  { icon: "house.fill" | "checklist" | "gearshape.fill"; label: string }
> = {
  "(home)": { icon: "house.fill", label: "Home" },
  tasks: { icon: "checklist", label: "Tasks" },
  settings: { icon: "gearshape.fill", label: "Settings" },
};

/**
 * The app's bottom navigation, as the Tabs navigator's `tabBar` (ticket-
 * less UI pass, inspired by the reference in ui-refferences/) — a dark
 * floating pill holding Home/Tasks/Settings.
 *
 * **Why a real tab bar.** Each screen used to render this itself and
 * `router.push` the chosen destination, which meant switching Home →
 * Tasks → Settings left three screens stacked rather than swapping between
 * three peers: the back gesture walked the whole history, and each visit
 * re-mounted its screen from scratch. As a `tabBar` the same pill drives
 * actual tab navigation — one screen per destination, each keeping its own
 * scroll position and its own nested history.
 *
 * Search is deliberately *not* a destination, though it shows this bar
 * like any other screen: Home already opens it from a full-width search
 * bar at the top of the screen (components/ui/search-bar-button.tsx), and
 * a second entry point to the same global Search bought nothing. Search
 * browses out of Home the way a Folder does — both live in the Home tab's
 * own stack (app/(tabs)/(home)/), so both leave Home lit here.
 *
 * The "new Note" FAB that sits beside this pill is deliberately *not* part
 * of it — see components/ui/add-note-button.tsx.
 *
 * The pill's dark background is one of the few colors that stays constant
 * across light/dark app theme (see constants/theme.ts's `navBackground`)
 * so it reads as fixed chrome rather than a themed surface. **Decided in
 * ticket 09:** an explicit Light theme mode does not change that. The
 * theme-mode preference chooses between the app's two palettes, and the
 * pill is deliberately outside both — it's a floating object over the
 * content, like a keyboard or a system share sheet, not a surface of the
 * page. Its *accent* does follow the user's choice: the active
 * destination's backing is drawn in `tint`.
 */
export function NavPill({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const navBackground = useThemeColor({}, "navBackground");
  const iconActive = useThemeColor({}, "navIconActive");
  const iconInactive = useThemeColor({}, "navIconInactive");
  const accent = useThemeColor({}, "tint");

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + 12 }]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { backgroundColor: navBackground }]}>
        {state.routes.map((route, index) => {
          const destination = DESTINATIONS[route.name];
          // A route the navigator knows but this bar has no entry for is
          // skipped rather than rendered blank — that's how a screen gets
          // to live under the tabs without becoming a destination.
          if (!destination) return null;

          const selected = state.index === index;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                // `navigation.emit` first so React Navigation's own
                // tabPress behaviour (scroll-to-top, popping the tab's
                // stack back to its root) still runs, and a listener that
                // calls `preventDefault` is still honoured.
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!selected && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              hitSlop={10}
              style={[styles.navButton, selected && { backgroundColor: accent }]}
              accessibilityRole="tab"
              accessibilityLabel={destination.label}
              accessibilityState={{ selected }}
            >
              {/* White-on-accent for the active destination, mirroring the
                  editor toolbar's active button (see `iconWrapperActive`
                  in app/note/[id].tsx) — the palette's accents are all
                  picked to carry white, so this reads at any accent, which
                  an accent-colored icon on the near-black pill would
                  not. */}
              <IconSymbol
                name={destination.icon}
                size={22}
                color={selected ? iconActive : iconInactive}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Floats over the screen's content rather than taking a band of its
    // own at the bottom: every list in the app already reserves the space
    // with a fixed bottom inset (see components/notes-list.tsx), and the
    // FAB beside this pill is positioned to the same rule from the screen
    // side (components/ui/add-note-button.tsx).
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    // No `flex: 1`: the pill hugs its buttons, and the gap/padding below
    // set the spacing, rather than the row's leftover width dictating it.
    flexDirection: "row",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
