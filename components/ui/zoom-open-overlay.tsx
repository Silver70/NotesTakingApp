import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, type ColorValue } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

/** Where on screen the transition should appear to come from — the centre
 * of the control the user tapped, in window coordinates, plus its radius
 * so the growing card starts out exactly the size of that control. */
export interface ZoomOrigin {
  x: number;
  y: number;
  radius: number;
}

/** How long the card takes to reach full screen, and how long it then
 * takes to dissolve into the screen underneath. Tuned so the whole thing
 * is over well inside the ~400ms a transition can take before it starts
 * feeling slow, while still being legible as movement. */
const GROW_MS = 300;
const FADE_MS = 140;

/**
 * The macOS "a window grows out of the icon you clicked" effect, for a
 * screen pushed from a specific control.
 *
 * A plain surface-colored card starts at `origin`, expands to fill the
 * screen, and dissolves — revealing the real screen that was mounting
 * behind it the whole time.
 *
 * **Why an overlay rather than scaling the screen itself.** The obvious
 * implementation is a `transform: scale` on the destination screen with
 * `transformOrigin` set to the tapped point. That falls down here: the
 * Note editor is a WebView (TenTap, ADR-0002), and a WKWebView scaled up
 * from near-zero renders blurry and re-lays-out its document mid-flight.
 * Growing an opaque card *over* the screen sidesteps that entirely —
 * nothing that is expensive to rasterize is ever transformed, and the
 * editor gets the whole animation to finish mounting before it's seen.
 *
 * Animates layout (`left`/`top`/`width`/`height`) rather than `transform`
 * deliberately: `borderRadius` under a scale transform would be scaled
 * too, so the card's corners would start at the button's roundness and
 * end up wrong. Driving the box directly keeps the radius under its own
 * control, which is what lets the shape read as "the button became the
 * page". It's one absolutely-positioned view with no children, so there is
 * no subtree to re-layout.
 *
 * Respects Reduced Motion: with it on, the overlay never renders at all
 * and the screen simply appears.
 */
export function ZoomOpenOverlay({
  origin,
  color,
  onFinished,
}: {
  origin: ZoomOrigin;
  /** The color the destination screen's background is painted in, so the
   * card reads as that page arriving rather than as a shape over it.
   * `ColorValue`, not `string` — the editor derives its surface color by
   * flattening a style, which can yield a platform color object. */
  color: ColorValue;
  /** Called once the overlay has finished and stopped covering anything,
   * so the screen can drop it rather than keep an invisible view around. */
  onFinished: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  // 0 = the tapped control, 1 = the full screen. One driver for every
  // property below, so they can't drift out of step.
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      onFinished();
      return;
    }
    const easing = Easing.out(Easing.cubic);
    progress.value = withTiming(1, { duration: GROW_MS, easing });
    opacity.value = withDelay(
      GROW_MS,
      withTiming(0, { duration: FADE_MS, easing: Easing.linear }, (done) => {
        if (done) {
          runOnJS(onFinished)();
        }
      }),
    );
  }, [progress, opacity, reducedMotion, onFinished]);

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const size = origin.radius * 2;
    return {
      left: (origin.x - origin.radius) * (1 - t),
      top: (origin.y - origin.radius) * (1 - t),
      width: size + (width - size) * t,
      height: size + (height - size) * t,
      borderRadius: origin.radius * (1 - t),
      opacity: opacity.value,
    };
  });

  if (reducedMotion) {
    return null;
  }

  return (
    <Animated.View
      // Purely decorative and gone in under half a second — it must never
      // swallow a tap meant for the screen underneath, nor become a stop
      // for a screen reader that has already been handed the real screen.
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.card, { backgroundColor: color }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    // Above the screen's own content, including the floating header and
    // toolbar chrome, so the page genuinely appears from behind it.
    zIndex: 10,
    elevation: 10,
  },
});
