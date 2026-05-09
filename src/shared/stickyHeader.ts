export function getStickyHeaderOffset(): number {
  const stickyHeader =
    document.querySelector<HTMLElement>("[class*='StickyHeader']") ??
    document.querySelector<HTMLElement>("[class*='pagehead']") ??
    document.querySelector<HTMLElement>(".js-sticky");

  if (!stickyHeader) {
    return 0;
  }

  const rect = stickyHeader.getBoundingClientRect();
  return rect.height > 0 && rect.top <= 1 ? rect.height : 0;
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
