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
