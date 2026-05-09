export function getStickyHeaderOffset(): number {
  const stickyHeaders = [
    ...document.querySelectorAll<HTMLElement>(
      [
        "[class*='use-sticky-header-module__stickyHeader']",
        "[class*='PullRequestFilesToolbar-module__toolbar']",
        "[class*='StickyHeader']",
        "[class*='pagehead']",
        ".js-sticky",
      ].join(",")
    ),
  ];

  if (!stickyHeaders.length) {
    return 0;
  }

  return stickyHeaders.reduce((offset, stickyHeader) => {
    const rect = stickyHeader.getBoundingClientRect();
    if (rect.height <= 0 || rect.top > 1) {
      return offset;
    }
    return Math.max(offset, Math.max(0, rect.bottom));
  }, 0);
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
