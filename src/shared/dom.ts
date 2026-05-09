export type FilePath = string & { readonly __brand: "FilePath" };

export function normalizePath(value: string | null | undefined): FilePath {
  return String(value ?? "")
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim() as FilePath;
}

export function basename(filePath: string): string {
  const parts = filePath.split("/");
  return parts[parts.length - 1] ?? "";
}

export function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return String(value).replace(/["\\]/g, "\\$&");
}

export function findCopyFileNameButton(
  header: HTMLElement
): HTMLElement | null {
  const candidates = Array.from(
    header.querySelectorAll<HTMLElement>("[id][aria-label], [id]")
  );

  const tooltip = candidates.find((node) => {
    const label = normalizePath(
      node.getAttribute("aria-label") ?? node.textContent ?? ""
    );
    return label === "Copy file name to clipboard";
  });

  if (!tooltip) {
    return null;
  }

  return header.querySelector<HTMLElement>(
    `[aria-labelledby='${cssEscape(tooltip.id)}']`
  );
}

export function getDiffRegions(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[role='region'][id^='diff-']")
  ).filter((region) => Boolean(getFilePathFromDiffRegion(region)));
}

export function getFilePathFromDiffRegion(region: HTMLElement): FilePath | null {
  const explicitPathNode = region.querySelector<HTMLElement>("[data-file-path]");
  const datasetPath = explicitPathNode?.dataset["filePath"];
  if (datasetPath) {
    return normalizePath(datasetPath);
  }

  const code = region.querySelector<HTMLElement>("h3 code");
  return code ? normalizePath(code.textContent) : null;
}

export function getRightSideLineCells(region: HTMLElement): HTMLElement[] {
  return Array.from(
    region.querySelectorAll<HTMLElement>("[data-line-number][data-diff-side='right']")
  );
}

export function getSelectedRightSideLineCells(region: HTMLElement): HTMLElement[] {
  return Array.from(
    region.querySelectorAll<HTMLElement>(
      "[data-line-number][data-diff-side='right'][data-selected='true']"
    )
  );
}

export function getReviewThreadNodes(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-testid='review-thread'], [data-marker-navigation-comment-thread-id]"
    )
  );
}

export function getNotViewedButton(region: HTMLElement): HTMLElement | null {
  return (
    region.querySelector<HTMLElement>("button[aria-label='Not Viewed']") ??
    Array.from(
      region.querySelectorAll<HTMLElement>("button[aria-pressed='false']")
    ).find((button) => normalizePath(button.textContent).includes("Viewed")) ??
    null
  );
}
