import { createIconButton, setButtonState } from "../../shared/buttonFactory";
import {
  EDITOR_BUTTON_CLASS,
  EDITOR_FLASH_MS,
} from "../../shared/constants";
import { normalizePath, type FilePath } from "../../shared/dom";
import { getEditorIconSvg } from "../../shared/icons";
import { installTooltip } from "../../shared/tooltip";
import {
  buildEditorCommand,
  copyText,
  getBestVisibleLineNumber,
} from "./editorCommand";
import {
  getEditorSettings,
  setEditorSettings,
  normalizeEditor,
  normalizeRepoRoot,
  guessLocalRepoRoot,
  type EditorSettings,
} from "./editorSettings";

const DEFAULT_TITLE =
  "Copy editor command. Option-click to configure.";

export function createEditorButton(
  filePath: FilePath,
  header: HTMLElement
): HTMLButtonElement {
  const button = createIconButton({
    ariaLabel: "Copy editor command",
    title: DEFAULT_TITLE,
    extraClassName: EDITOR_BUTTON_CLASS,
    innerHtml: getEditorIconSvg(),
    dataset: { filePath },
  });

  installTooltip(button, DEFAULT_TITLE);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.altKey) {
      void configureEditorCommand(button);
      return;
    }

    void copyEditorCommand(button, header);
  });
  return button;
}

async function copyEditorCommand(
  button: HTMLButtonElement,
  header: HTMLElement
): Promise<void> {
  let settings = await getEditorSettings();
  if (!settings.repoRoot) {
    settings = await configureEditorCommand(button);
    if (!settings.repoRoot) {
      flashEditorButton(
        button,
        "error",
        "Editor command needs a local repository root"
      );
      return;
    }
  }

  const filePath = normalizePath(button.dataset["filePath"]);
  const lineNumber = getBestVisibleLineNumber(header);
  const command = buildEditorCommand(
    settings.editor,
    settings.repoRoot,
    filePath,
    lineNumber
  );

  try {
    await copyText(command);
    flashEditorButton(button, "copied", `Copied: ${command}`);
  } catch {
    flashEditorButton(button, "error", "Could not copy editor command");
  }
}

async function configureEditorCommand(
  button: HTMLButtonElement
): Promise<EditorSettings> {
  const current = await getEditorSettings();

  const editorAnswer = window.prompt(
    "Editor command: cursor or code",
    current.editor
  );
  if (editorAnswer === null) {
    return current;
  }
  const editor = normalizeEditor(editorAnswer);

  const repoRootAnswer = window.prompt(
    "Local repository root",
    current.repoRoot || guessLocalRepoRoot()
  );
  if (repoRootAnswer === null) {
    return current;
  }
  const repoRoot = normalizeRepoRoot(repoRootAnswer);

  const next = await setEditorSettings({ editor, repoRoot });
  flashEditorButton(button, "copied", "Editor command settings saved");
  return next;
}

function flashEditorButton(
  button: HTMLButtonElement,
  state: "copied" | "error",
  title: string
): void {
  setButtonState(button, state);
  button.title = title;
  window.setTimeout(() => {
    setButtonState(button, "");
    button.title = DEFAULT_TITLE;
  }, EDITOR_FLASH_MS);
}
