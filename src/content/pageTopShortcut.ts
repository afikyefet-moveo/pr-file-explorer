import {
  eventMatchesShortcut,
  isEditableTarget,
  parseShortcut,
  type ParsedShortcut,
} from "../shared/shortcut";

let listener: ((event: KeyboardEvent) => void) | null = null;
let parsed: ParsedShortcut | null = null;

export function installPageTopShortcut(combo: string): void {
  parsed = parseShortcut(combo);

  if (listener) {
    return;
  }

  listener = (event: KeyboardEvent): void => {
    if (!parsed || isEditableTarget(event.target)) {
      return;
    }
    if (!eventMatchesShortcut(event, parsed)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.addEventListener("keydown", listener, true);
}

export function updatePageTopShortcut(combo: string): void {
  parsed = parseShortcut(combo);
}

export function uninstallPageTopShortcut(): void {
  if (listener) {
    window.removeEventListener("keydown", listener, true);
    listener = null;
  }
  parsed = null;
}
