import {
  getEditorSettings,
  normalizeEditor,
  normalizeRepoRoot,
  setEditorSettings,
  type EditorChoice,
} from "../features/editor/editorSettings";

const STATUS_RESET_MS = 2400;

function $<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) {
    throw new Error(`Missing element: ${selector}`);
  }
  return node;
}

async function init(): Promise<void> {
  const form = $<HTMLFormElement>("#editor-form");
  const enabledInput = $<HTMLInputElement>("#enabled");
  const editorSelect = $<HTMLSelectElement>("#editor");
  const repoRootInput = $<HTMLInputElement>("#repoRoot");
  const status = $<HTMLSpanElement>("#status");

  const settings = await getEditorSettings();
  enabledInput.checked = settings.enabled;
  editorSelect.value = settings.editor;
  repoRootInput.value = settings.repoRoot;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void save();
  });

  async function save(): Promise<void> {
    try {
      await setEditorSettings({
        enabled: enabledInput.checked,
        editor: normalizeEditor(editorSelect.value) as EditorChoice,
        repoRoot: normalizeRepoRoot(repoRootInput.value),
      });
      flash("Saved.", "ok");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      flash(`Could not save: ${message}`, "error");
    }
  }

  function flash(message: string, state: "ok" | "error"): void {
    status.textContent = message;
    status.dataset["state"] = state;
    window.setTimeout(() => {
      status.textContent = "";
      delete status.dataset["state"];
    }, STATUS_RESET_MS);
  }
}

void init();
