/**
 * Backwards-compatible facade over `shared/settings.ts`. The single source of
 * truth for all settings now lives in `shared/settings.ts`, but the editor
 * feature historically owned its own settings module. Existing imports keep
 * working through these re-exports.
 */
import {
  getSettings,
  setSettings,
  onSettingsChanged,
  guessLocalRepoRoot,
  normalizeEditor,
  normalizeRepoRoot,
  type Settings,
  type EditorChoice,
} from "../../shared/settings";

export { guessLocalRepoRoot, normalizeEditor, normalizeRepoRoot };
export type { EditorChoice };

export interface EditorSettings {
  enabled: boolean;
  editor: EditorChoice;
  repoRoot: string;
}

function project(settings: Settings): EditorSettings {
  return {
    enabled: settings.editorEnabled,
    editor: settings.editor,
    repoRoot: settings.repoRoot,
  };
}

export async function getEditorSettings(): Promise<EditorSettings> {
  return project(await getSettings());
}

export async function setEditorSettings(
  patch: Partial<EditorSettings>
): Promise<EditorSettings> {
  const next = await setSettings({
    ...(patch.enabled !== undefined ? { editorEnabled: patch.enabled } : {}),
    ...(patch.editor !== undefined ? { editor: patch.editor } : {}),
    ...(patch.repoRoot !== undefined ? { repoRoot: patch.repoRoot } : {}),
  });
  return project(next);
}

export function onEditorSettingsChanged(
  listener: (settings: EditorSettings) => void
): () => void {
  return onSettingsChanged((settings) => listener(project(settings)));
}
