import { normalizePath } from "../../shared/dom";
import type { EditorChoice } from "./editorSettings";

export function buildEditorCommand(
  editor: EditorChoice,
  repoRoot: string,
  filePath: string,
  lineNumber: string
): string {
  let target = `${repoRoot}/${filePath}`;
  if (lineNumber) {
    target += `:${lineNumber}`;
  }
  return `${editor} -g ${shellQuote(target)}`;
}

export function shellQuote(value: string): string {
  return `"${String(value).replace(/(["\\$`])/g, "\\$1")}"`;
}

export function getBestVisibleLineNumber(header: HTMLElement): string {
  const region = header.closest<HTMLElement>("[role='region']");
  if (!region) {
    return "";
  }

  const cells = Array.from(
    region.querySelectorAll<HTMLElement>(
      "[data-line-number][data-diff-side='right']"
    )
  );
  const viewportTop = 0;
  const viewportBottom =
    window.innerHeight || document.documentElement.clientHeight;

  const visible = cells.find((cell) => {
    const rect = cell.getBoundingClientRect();
    return rect.bottom > viewportTop && rect.top < viewportBottom;
  });

  return visible
    ? normalizePath(visible.getAttribute("data-line-number"))
    : "";
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const ok = document.execCommand("copy");
    if (!ok) {
      throw new Error("execCommand('copy') returned false");
    }
  } finally {
    textarea.remove();
  }
}
