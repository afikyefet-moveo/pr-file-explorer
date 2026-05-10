export type EditorChoice = "cursor" | "code";
export type ScrollTarget = "filesTop" | "pageTop";

export interface Settings {
  locateEnabled: boolean;
  backToTopEnabled: boolean;
  backToTopClickAction: ScrollTarget;
  backToTopShiftClickAction: ScrollTarget;
  reviewFlowEnabled: boolean;
  reviewFlowPreviousCommentEnabled: boolean;
  reviewFlowNextCommentEnabled: boolean;
  reviewFlowNextUnviewedEnabled: boolean;
  reviewFlowCopyContextEnabled: boolean;
  reviewFlowCopyCommentsToAgentEnabled: boolean;
  fileTabsEnabled: boolean;
  editorEnabled: boolean;
  editor: EditorChoice;
  repoRoot: string;
  pageTopShortcutEnabled: boolean;
  pageTopShortcut: string;
  explorerSyncEnabled: boolean;
}

const STORAGE_KEYS = {
  locateEnabled: "prFileExplorer.locateEnabled",
  backToTopEnabled: "prFileExplorer.backToTopEnabled",
  backToTopClickAction: "prFileExplorer.backToTopClickAction",
  backToTopShiftClickAction: "prFileExplorer.backToTopShiftClickAction",
  reviewFlowEnabled: "prFileExplorer.reviewFlowEnabled",
  reviewFlowPreviousCommentEnabled:
    "prFileExplorer.reviewFlowPreviousCommentEnabled",
  reviewFlowNextCommentEnabled: "prFileExplorer.reviewFlowNextCommentEnabled",
  reviewFlowNextUnviewedEnabled:
    "prFileExplorer.reviewFlowNextUnviewedEnabled",
  reviewFlowCopyContextEnabled: "prFileExplorer.reviewFlowCopyContextEnabled",
  reviewFlowCopyCommentsToAgentEnabled:
    "prFileExplorer.reviewFlowCopyCommentsToAgentEnabled",
  fileTabsEnabled: "prFileExplorer.fileTabsEnabled",
  editorEnabled: "prFileExplorer.editorEnabled",
  editor: "prFileExplorer.editor",
  repoRoot: "prFileExplorer.repoRoot",
  pageTopShortcutEnabled: "prFileExplorer.pageTopShortcutEnabled",
  pageTopShortcut: "prFileExplorer.pageTopShortcut",
  explorerSyncEnabled: "prFileExplorer.explorerSyncEnabled",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  locateEnabled: true,
  backToTopEnabled: true,
  backToTopClickAction: "filesTop",
  backToTopShiftClickAction: "pageTop",
  reviewFlowEnabled: true,
  reviewFlowPreviousCommentEnabled: true,
  reviewFlowNextCommentEnabled: true,
  reviewFlowNextUnviewedEnabled: true,
  reviewFlowCopyContextEnabled: true,
  reviewFlowCopyCommentsToAgentEnabled: true,
  fileTabsEnabled: true,
  editorEnabled: true,
  editor: "cursor",
  repoRoot: "",
  pageTopShortcutEnabled: true,
  pageTopShortcut: "Shift+T",
  explorerSyncEnabled: false,
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
    reviewFlowEnabled: coerceBool(
      stored[STORAGE_KEYS.reviewFlowEnabled],
      DEFAULT_SETTINGS.reviewFlowEnabled
    ),
    reviewFlowPreviousCommentEnabled: coerceBool(
      stored[STORAGE_KEYS.reviewFlowPreviousCommentEnabled],
      DEFAULT_SETTINGS.reviewFlowPreviousCommentEnabled
    ),
    reviewFlowNextCommentEnabled: coerceBool(
      stored[STORAGE_KEYS.reviewFlowNextCommentEnabled],
      DEFAULT_SETTINGS.reviewFlowNextCommentEnabled
    ),
    reviewFlowNextUnviewedEnabled: coerceBool(
      stored[STORAGE_KEYS.reviewFlowNextUnviewedEnabled],
      DEFAULT_SETTINGS.reviewFlowNextUnviewedEnabled
    ),
    reviewFlowCopyContextEnabled: coerceBool(
      stored[STORAGE_KEYS.reviewFlowCopyContextEnabled],
      DEFAULT_SETTINGS.reviewFlowCopyContextEnabled
    ),
    reviewFlowCopyCommentsToAgentEnabled: coerceBool(
      stored[STORAGE_KEYS.reviewFlowCopyCommentsToAgentEnabled],
      DEFAULT_SETTINGS.reviewFlowCopyCommentsToAgentEnabled
    ),
    fileTabsEnabled: coerceBool(
      stored[STORAGE_KEYS.fileTabsEnabled],
      DEFAULT_SETTINGS.fileTabsEnabled
    ),
    editorEnabled: coerceBool(
      stored[STORAGE_KEYS.editorEnabled],
      DEFAULT_SETTINGS.editorEnabled
    ),
    editor: normalizeEditor(stored[STORAGE_KEYS.editor]),
    repoRoot: normalizeRepoRoot(stored[STORAGE_KEYS.repoRoot]),
    pageTopShortcutEnabled: coerceBool(
      stored[STORAGE_KEYS.pageTopShortcutEnabled],
      DEFAULT_SETTINGS.pageTopShortcutEnabled
    ),
    pageTopShortcut: normalizeShortcut(
      stored[STORAGE_KEYS.pageTopShortcut],
      DEFAULT_SETTINGS.pageTopShortcut
    ),
    explorerSyncEnabled: coerceBool(
      stored[STORAGE_KEYS.explorerSyncEnabled],
      DEFAULT_SETTINGS.explorerSyncEnabled
    ),
  };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({
    [STORAGE_KEYS.locateEnabled]: next.locateEnabled,
    [STORAGE_KEYS.backToTopEnabled]: next.backToTopEnabled,
    [STORAGE_KEYS.backToTopClickAction]: next.backToTopClickAction,
    [STORAGE_KEYS.backToTopShiftClickAction]: next.backToTopShiftClickAction,
    [STORAGE_KEYS.reviewFlowEnabled]: next.reviewFlowEnabled,
    [STORAGE_KEYS.reviewFlowPreviousCommentEnabled]:
      next.reviewFlowPreviousCommentEnabled,
    [STORAGE_KEYS.reviewFlowNextCommentEnabled]:
      next.reviewFlowNextCommentEnabled,
    [STORAGE_KEYS.reviewFlowNextUnviewedEnabled]:
      next.reviewFlowNextUnviewedEnabled,
    [STORAGE_KEYS.reviewFlowCopyContextEnabled]:
      next.reviewFlowCopyContextEnabled,
    [STORAGE_KEYS.reviewFlowCopyCommentsToAgentEnabled]:
      next.reviewFlowCopyCommentsToAgentEnabled,
    [STORAGE_KEYS.fileTabsEnabled]: next.fileTabsEnabled,
    [STORAGE_KEYS.editorEnabled]: next.editorEnabled,
    [STORAGE_KEYS.editor]: next.editor,
    [STORAGE_KEYS.repoRoot]: next.repoRoot,
    [STORAGE_KEYS.pageTopShortcutEnabled]: next.pageTopShortcutEnabled,
    [STORAGE_KEYS.pageTopShortcut]: next.pageTopShortcut,
    [STORAGE_KEYS.explorerSyncEnabled]: next.explorerSyncEnabled,
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

function normalizeShortcut(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? fallback : trimmed;
}
