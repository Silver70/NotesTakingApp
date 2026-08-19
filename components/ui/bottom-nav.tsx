import type { Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export type NavSection = "home" | "tasks" | "settings";

/** Where each destination lives, owned here beside the buttons themselves
 * rather than re-derived by every screen that renders the nav — adding a
 * destination is then one entry here plus one row in `DESTINATIONS`, not
 * an edit to all five screens. */
export const NAV_ROUTES: Record<NavSection, Href> = {
  home: "/",
  tasks: "/tasks",
  settings: "/settings",
};

const DESTINATIONS: {
  section: NavSection;
  icon: "house.fill" | "checklist" | "gearshape.fill";
  label: string;
}[] = [
  { section: "home", icon: "house.fill", label: "Home" },
  { section: "tasks", icon: "checklist", label: "Tasks" },
  { section: "settings", icon: "gearshape.fill", label: "Settings" },
];

/**
 * The floating bottom chrome shared by Home, Folder-browse, Search, Tasks,
 * and Settings (ticket-less UI pass, inspired by the reference in
 * ui-refferences/) — a dark pill holding Home/Tasks/Settings, plus a
 * separate accent-colored FAB for "new Note". Deliberately absent from
 * the Note editor, which has its own floating back/toolbar chrome
 * instead.
 *
 * Search is deliberately *not* one of the destinations, though the Search
 * screen renders this nav like any other: Home already opens it from a
 * full-width search bar at the top of the screen
 * (components/ui/search-bar-button.tsx), and a second entry point to the
 * same global Search bought nothing. Search browses out of Home the way
 * a Folder does, so both pass `active="home"`.
 *
 * The pill's dark background is one of the few colors that stays constant
 * across light/dark app theme (see constants/theme.ts's `navBackground`)
 * so it reads as fixed chrome rather than a themed surface. **Decided in
 * ticket 09:** an explicit Light theme mode does not change that. The
 * theme-mode preference chooses between the app's two palettes, and the
 * pill is deliberately outside both — it's a floating object over the
 * content, like a keyboard or a system share sheet, not a surface of the
 * page. Its *accent* does follow the user's choice: the FAB, and the
 * active destination's backing, both of which are drawn in `tint`.
 */
export function BottomNav({
  active,
  onNavigate,
  onAdd,
}: {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  onAdd: () => void;
}) {
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
        {DESTINATIONS.map(({ section, icon, label }) => {
          const selected = section === active;
          return (
            <Pressable
              key={section}
              // Swallowed rather than routed: pushing the screen the user
              // is already on would stack a second copy of it behind them.
              onPress={() => (selected ? undefined : onNavigate(section))}
              hitSlop={10}
              style={[styles.navButton, selected && { backgroundColor: accent }]}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
            >
              {/* White-on-accent for the active destination, mirroring the
                  editor toolbar's active button (see `iconWrapperActive`
                  in app/note/[id].tsx) — the palette's accents are all
                  picked to carry white, so this reads at any accent, which
                  an accent-colored icon on the near-black pill would
                  not. */}
              <IconSymbol
                name={icon}
                size={22}
                color={selected ? iconActive : iconInactive}
              />
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={onAdd}
        style={[styles.fab, { backgroundColor: accent }]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="New Note"
      >
        <IconSymbol name="plus" size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    // Pill left, FAB right, the leftover width between them. The pill no
    // longer stretches (see below), so without this the two would sit
    // shoulder to shoulder and read as one wide control rather than as
    // the nav and a separate action. `gap` is only a floor for a screen
    // too narrow to leave any space between them.
    justifyContent: "space-between",
    gap: 12,
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
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
