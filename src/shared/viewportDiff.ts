import { getDiffRegions } from "./dom";

/**
 * Pick the diff region that matches the "active file" band used by file tabs:
 * vertical midpoint of the viewport reading area below sticky chrome.
 */
export function pickPrimaryVisibleDiffRegion(readingBandTopOffset: number): HTMLElement | null {
  const regions = getDiffRegions();
  if (regions.length === 0) {
    return null;
  }

  const top = readingBandTopOffset;
  const height = window.innerHeight || document.documentElement.clientHeight;
  const middle = top + (height - top) / 2;

  for (const region of regions) {
    const rect = region.getBoundingClientRect();
    if (rect.top <= middle && rect.bottom >= middle) {
      return region;
    }
  }

  let best: HTMLElement | null = null;
  let bestDist = Infinity;
  for (const region of regions) {
    const rect = region.getBoundingClientRect();
    const clamped = Math.min(Math.max(middle, rect.top), rect.bottom);
    const dist = Math.abs(middle - clamped);
    if (dist < bestDist) {
      bestDist = dist;
      best = region;
    }
  }

  return best;
}
