/**
 * Carrying a tapped control's position across a navigation.
 *
 * Route params are strings — expo-router serializes them into the URL —
 * so the origin a screen animates out of has to survive a round trip
 * through text. These two functions are that round trip, kept together so
 * the param names are written once rather than at every push site and
 * every read site.
 *
 * Everything here is total: a push with no origin (a deep link, a
 * programmatic navigation, an older build's URL) parses back to `null`
 * rather than to a broken origin at 0,0, and the destination simply
 * appears without the animation.
 */

import type { ZoomOrigin } from '@/components/ui/zoom-open-overlay';

/** The params a push should carry to animate out of `origin`. */
export function toZoomParams(origin: ZoomOrigin): {
  zoomX: string;
  zoomY: string;
  zoomR: string;
} {
  return {
    zoomX: String(origin.x),
    zoomY: String(origin.y),
    zoomR: String(origin.radius),
  };
}

/** The origin a screen was pushed from, or `null` if it wasn't pushed
 * from anywhere in particular. */
export function parseZoomOrigin(params: {
  zoomX?: string;
  zoomY?: string;
  zoomR?: string;
}): ZoomOrigin | null {
  const x = Number(params.zoomX);
  const y = Number(params.zoomY);
  const radius = Number(params.zoomR);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) {
    return null;
  }
  return { x, y, radius };
}
