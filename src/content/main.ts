import {
  getEditorSettings,
  onEditorSettingsChanged,
  type EditorSettings,
} from "../features/editor/editorSettings";
import { enhanceFileHeaders } from "./enhanceFileHeaders";
import { installGoToTopButton } from "./goToTopButton";
import { observeGitHubUpdates } from "./observeGitHubUpdates";

let cachedSettings: EditorSettings | null = null;

async function init(): Promise<void> {
  cachedSettings = await getEditorSettings();

  enhanceAll();
  installGoToTopButton();
  observeGitHubUpdates(enhanceAll);

  onEditorSettingsChanged((next) => {
    cachedSettings = next;
    enhanceAll();
  });
}

function enhanceAll(): void {
  enhanceFileHeaders({
    withEditorButton: cachedSettings?.enabled === true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      void init();
    },
    { once: true }
  );
} else {
  void init();
}
