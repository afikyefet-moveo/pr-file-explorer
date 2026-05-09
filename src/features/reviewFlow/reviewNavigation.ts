import { getStickyHeaderOffset } from "../../shared/stickyHeader";

export function findNextElementByViewport(
  elements: HTMLElement[]
): HTMLElement | null {
  const viewportTop = getStickyHeaderOffset();
  const next = elements
    .map((element) => ({
      element,
      top: element.getBoundingClientRect().top,
    }))
    .filter((entry) => entry.top > viewportTop + 24)
    .sort((a, b) => a.top - b.top)[0];

  return next?.element ?? null;
}

export function scrollToElement(element: HTMLElement): void {
  const targetTop =
    element.getBoundingClientRect().top + window.scrollY - getStickyHeaderOffset() - 12;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}

