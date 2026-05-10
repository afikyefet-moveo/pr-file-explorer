const STICKY_HEADER_SELECTOR = [
  "[class*='use-sticky-header-module__stickyHeader']",
  "[class*='PullRequestFilesToolbar-module__toolbar']",
  "[class*='StickyHeader']",
  "[class*='pagehead']",
  ".js-sticky",
].join(",");

const STICKY_STACK_TOLERANCE_PX = 2;
const STICKY_STACK_MAX_ITERATIONS = 10;

function layerBottomBelow(
  offset: number,
  elements: HTMLElement[],
  tolerancePx: number
): number {
  let maxBottom = offset;
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0 || rect.width <= 0) {
      continue;
    }
    if (rect.top <= offset + tolerancePx && rect.bottom > offset) {
      maxBottom = Math.max(maxBottom, rect.bottom);
    }
  }
  return maxBottom;
}

/**
 * Height from the top of the viewport occupied by GitHub chrome that stacks
 * flush together (global header, then PR files toolbar when stuck). Uses an
 * iterative pass so a toolbar stuck directly under the site header is included
 * even when its `top` is not ~0.
 */
export function getStickyHeaderOffset(): number {
  const candidates = [
    ...document.querySelectorAll<HTMLElement>(STICKY_HEADER_SELECTOR),
  ];

  if (!candidates.length) {
    return 0;
  }

  let offset = 0;
  for (let i = 0; i < STICKY_STACK_MAX_ITERATIONS; i++) {
    const next = layerBottomBelow(offset, candidates, STICKY_STACK_TOLERANCE_PX);
    if (next <= offset + 0.5) {
      break;
    }
    offset = next;
  }

  return offset;
}

export function getFilesTopScrollY(): number {
  const target =
    document.querySelector<HTMLElement>("[data-testid='diff-content']") ??
    document.querySelector<HTMLElement>("[data-testid='progressive-diffs-list']") ??
    document.querySelector<HTMLElement>("#files") ??
    document.body;

  const stickyOffset = getStickyHeaderOffset();
  const targetTop =
    target.getBoundingClientRect().top + window.scrollY - stickyOffset - 8;
  return Math.max(0, targetTop);
}
