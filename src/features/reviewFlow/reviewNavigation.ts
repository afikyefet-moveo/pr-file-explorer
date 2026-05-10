import { getStickyHeaderOffset } from "../../shared/stickyHeader";

export function findNextElementByViewport(
  elements: HTMLElement[]
): HTMLElement | null {
  const anchorY = window.scrollY + getStickyHeaderOffset() + 24;
  const next = elements
    .map((element) => ({
      element,
      top: element.getBoundingClientRect().top + window.scrollY,
    }))
    .filter((entry) => entry.top > anchorY)
    .sort((a, b) => a.top - b.top)[0];

  return next?.element ?? null;
}

export function findPreviousElementByViewport(
  elements: HTMLElement[]
): HTMLElement | null {
  const anchorY = window.scrollY + getStickyHeaderOffset();
  const previous = elements
    .map((element) => ({
      element,
      top: element.getBoundingClientRect().top + window.scrollY,
    }))
    .filter((entry) => entry.top < anchorY)
    .sort((a, b) => b.top - a.top)[0];

  return previous?.element ?? null;
}

export function scrollToElement(element: HTMLElement): void {
  const targetTop =
    element.getBoundingClientRect().top + window.scrollY - getStickyHeaderOffset() - 12;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}
