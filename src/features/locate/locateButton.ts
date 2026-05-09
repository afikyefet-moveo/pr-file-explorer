import { createIconButton, setButtonState } from "../../shared/buttonFactory";
import { BUTTON_CLASS, NOT_FOUND_FLASH_MS } from "../../shared/constants";
import { normalizePath, type FilePath } from "../../shared/dom";
import { getLocateIconSvg } from "../../shared/icons";
import { installTooltip } from "../../shared/tooltip";
import {
  findFileTreeItem,
  highlightTreeItem,
  scrollItemIntoExplorerView,
} from "./locateFile";

export function createLocateButton(filePath: FilePath): HTMLButtonElement {
  const button = createIconButton({
    ariaLabel: "Locate file in file explorer",
    title: "Locate file in file explorer",
    extraClassName: BUTTON_CLASS,
    innerHtml: getLocateIconSvg(),
    dataset: { filePath },
  });

  installTooltip(button, "Locate this file in the file explorer");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    locateFileFromButton(button);
  });
  return button;
}

function locateFileFromButton(button: HTMLButtonElement): void {
  const filePath = normalizePath(button.dataset["filePath"]);
  const match = findFileTreeItem(filePath);

  if (!match) {
    flashButtonNotFound(button);
    return;
  }

  scrollItemIntoExplorerView(match);
  highlightTreeItem(match);
  setButtonState(button, "");
}

function flashButtonNotFound(button: HTMLButtonElement): void {
  setButtonState(button, "not-found");
  button.title = "File was not found in the visible file explorer";
  window.setTimeout(() => {
    setButtonState(button, "");
    button.title = "Locate file in file explorer";
  }, NOT_FOUND_FLASH_MS);
}
