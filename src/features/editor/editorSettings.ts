export type EditorChoice = "cursor" | "code";

export interface EditorSettings {
  enabled: boolean;
  editor: EditorChoice;
  repoRoot: string;
}

const STORAGE_KEYS = {
  enabled: "prFileExplorer.editorEnabled",
  editor: "prFileExplorer.editor",
  repoRoot: "prFileExplorer.repoRoot",
} as const;

const DEFAULT_SETTINGS: EditorSettings = {
  enabled: false,
  editor: "cursor",
  repoRoot: "",
};

export async function getEditorSettings(): Promise<EditorSettings> {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.enabled,
    STORAGE_KEYS.editor,
    STORAGE_KEYS.repoRoot,
  ]);

  return {
    enabled: Boolean(stored[STORAGE_KEYS.enabled] ?? DEFAULT_SETTINGS.enabled),
    editor: normalizeEditor(stored[STORAGE_KEYS.editor]),
    repoRoot: normalizeRepoRoot(stored[STORAGE_KEYS.repoRoot]),
  };
}

export async function setEditorSettings(
  patch: Partial<EditorSettings>
): Promise<EditorSettings> {
  const next = { ...(await getEditorSettings()), ...patch };
  await chrome.storage.local.set({
    [STORAGE_KEYS.enabled]: next.enabled,
    [STORAGE_KEYS.editor]: next.editor,
    [STORAGE_KEYS.repoRoot]: next.repoRoot,
  });
  return next;
}

export function onEditorSettingsChanged(
  listener: (settings: EditorSettings) => void
): () => void {
  const handler = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: chrome.storage.AreaName
  ): void => {
    if (areaName !== "local") {
      return;
    }
    const watched = [
      STORAGE_KEYS.enabled,
      STORAGE_KEYS.editor,
      STORAGE_KEYS.repoRoot,
    ];
    if (!watched.some((key) => key in changes)) {
      return;
    }
    void getEditorSettings().then(listener);
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
