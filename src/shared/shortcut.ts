export interface ParsedShortcut {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

export function parseShortcut(value: string): ParsedShortcut | null {
  const parts = value
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const result: ParsedShortcut = {
    shift: false,
    ctrl: false,
    alt: false,
    meta: false,
    key: "",
  };

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === "shift") {
      result.shift = true;
    } else if (lower === "ctrl" || lower === "control") {
      result.ctrl = true;
    } else if (lower === "alt" || lower === "option") {
      result.alt = true;
    } else if (lower === "meta" || lower === "cmd" || lower === "command") {
      result.meta = true;
    } else {
      result.key = normalizeKey(part);
    }
  }

  return result.key ? result : null;
}

export function formatShortcut(parsed: ParsedShortcut): string {
  const parts: string[] = [];
  if (parsed.ctrl) parts.push("Ctrl");
  if (parsed.alt) parts.push("Alt");
  if (parsed.shift) parts.push("Shift");
  if (parsed.meta) parts.push("Meta");
  if (parsed.key) parts.push(parsed.key);
  return parts.join("+");
}

export function eventToShortcut(event: KeyboardEvent): ParsedShortcut | null {
  if (MODIFIER_KEYS.has(event.key)) {
    return null;
  }
  return {
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    meta: event.metaKey,
    key: normalizeKey(event.key),
  };
}

export function eventMatchesShortcut(
  event: KeyboardEvent,
  parsed: ParsedShortcut
): boolean {
  return (
    event.shiftKey === parsed.shift &&
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.metaKey === parsed.meta &&
    normalizeKey(event.key) === parsed.key
  );
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function normalizeKey(value: string): string {
  if (!value) return "";
  if (value.length === 1) return value.toUpperCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
}
