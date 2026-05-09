export type EditorChoice = "cursor" | "code";
export type ScrollTarget = "filesTop" | "pageTop";

export interface Settings {
  locateEnabled: boolean;
  backToTopEnabled: boolean;
  backToTopClickAction: ScrollTarget;
  backToTopShiftClickAction: ScrollTarget;
  editorEnabled: boolean;
  editor: EditorChoice;
  repoRoot: string;
}

const STORAGE_KEYS = {
  locateEnabled: "prFileExplorer.locateEnabled",
  backToTopEnabled: "prFileExplorer.backToTopEnabled",
  backToTopClickAction: "prFileExplorer.backToTopClickAction",
  backToTopShiftClickAction: "prFileExplorer.backToTopShiftClickAction",
  editorEnabled: "prFileExplorer.editorEnabled",
  editor: "prFileExplorer.editor",
  repoRoot: "prFileExplorer.repoRoot",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  locateEnabled: true,
  backToTopEnabled: true,
  backToTopClickAction: "filesTop",
  backToTopShiftClickAction: "pageTop",
  editorEnabled: true,
  editor: "cursor",
  repoRoot: "",
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(Object.values(STORAGE_KEYS));

  return {
    locateEnabled: coerceBool(
      stored[STORAGE_KEYS.locateEnabled],
      DEFAULT_SETTINGS.locateEnabled
    ),
    backToTopEnabled: coerceBool(
      stored[STORAGE_KEYS.backToTopEnabled],
      DEFAULT_SETTINGS.backToTopEnabled
    ),
    backToTopClickAction: normalizeScrollTarget(
      stored[STORAGE_KEYS.backToTopClickAction],
      DEFAULT_SETTINGS.backToTopClickAction
    ),
    backToTopShiftClickAction: normalizeScrollTarget(
      stored[STORAGE_KEYS.backToTopShiftClickAction],
      DEFAULT_SETTINGS.backToTopShiftClickAction
    ),
    editorEnabled: coerceBool(
      stored[STORAGE_KEYS.editorEnabled],
      DEFAULT_SETTINGS.editorEnabled
    ),
    editor: normalizeEditor(stored[STORAGE_KEYS.editor]),
    repoRoot: normalizeRepoRoot(stored[STORAGE_KEYS.repoRoot]),
  };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({
    [STORAGE_KEYS.locateEnabled]: next.locateEnabled,
    [STORAGE_KEYS.backToTopEnabled]: next.backToTopEnabled,
    [STORAGE_KEYS.backToTopClickAction]: next.backToTopClickAction,
    [STORAGE_KEYS.backToTopShiftClickAction]: next.backToTopShiftClickAction,
    [STORAGE_KEYS.editorEnabled]: next.editorEnabled,
    [STORAGE_KEYS.editor]: next.editor,
    [STORAGE_KEYS.repoRoot]: next.repoRoot,
  });
  return next;
}

export function onSettingsChanged(
  listener: (settings: Settings) => void
): () => void {
  const watched = new Set<string>(Object.values(STORAGE_KEYS));
  const handler = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: chrome.storage.AreaName
  ): void => {
    if (areaName !== "local") {
      return;
    }
    if (!Object.keys(changes).some((key) => watched.has(key))) {
      return;
    }
    void getSettings().then(listener);
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export function normalizeEditor(value: unknown): EditorChoice {
  return String(value ?? "").trim().toLowerCase() === "code" ? "code" : "cursor";
}

export function normalizeRepoRoot(value: unknown): string {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

export function guessLocalRepoRoot(): string {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const repo = parts[1] ?? "repo";
  return `~/Projects/${repo}`;
}

function coerceBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === undefined || value === null) {
    return fallback;
  }
  return Boolean(value);
}

function normalizeScrollTarget(
  value: unknown,
  fallback: ScrollTarget
): ScrollTarget {
  return value === "pageTop" || value === "filesTop"
    ? (value as ScrollTarget)
    : fallback;
}
