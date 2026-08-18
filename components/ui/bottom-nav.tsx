import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export type NavSection = "home" | "search";

/**
 * The floating bottom chrome shared by Home, Folder-browse, and Search
 * (ticket-less UI pass, inspired by the reference in ui-refferences/) — a
 * dark pill holding Home/Search, plus a separate accent-colored FAB for
 * "new Note". Deliberately absent from the Note editor, which has its own
 * floating back/toolbar chrome instead.
 *
 * The pill's dark background is one of the few colors that stays constant
 * across light/dark app theme (see constants/theme.ts's `navBackground`)
 * so it reads as fixed chrome rather than a themed surface.
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
        <Pressable
          onPress={() => onNavigate("home")}
          hitSlop={10}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Home"
          accessibilityState={{ selected: active === "home" }}
        >
          <IconSymbol
            name="house.fill"
            size={22}
            color={active === "home" ? iconActive : iconInactive}
          />
        </Pressable>
        <Pressable
          onPress={() => onNavigate("search")}
          hitSlop={10}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Search"
          accessibilityState={{ selected: active === "search" }}
        >
          <IconSymbol
            name="magnifyingglass"
            size={22}
            color={active === "search" ? iconActive : iconInactive}
          />
        </Pressable>
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
    gap: 12,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "space-evenly",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  navButton: {
    width: 48,
    height: 48,
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
