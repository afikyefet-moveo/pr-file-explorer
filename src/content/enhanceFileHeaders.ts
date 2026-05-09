import { createEditorButton } from "../features/editor/editorButton";
import { createLocateButton } from "../features/locate/locateButton";
import {
  BUTTON_CLASS,
  EDITOR_BUTTON_CLASS,
} from "../shared/constants";
import {
  findCopyFileNameButton,
  normalizePath,
  type FilePath,
} from "../shared/dom";

export interface EnhanceOptions {
  withLocateButton: boolean;
  withEditorButton: boolean;
}

export function enhanceFileHeaders(options: EnhanceOptions): void {
  if (!options.withLocateButton) {
    removeInjectedButtons();
    return;
  }

  if (!options.withEditorButton) {
    removeButtons(EDITOR_BUTTON_CLASS);
  }

  for (const header of getCandidateHeaderNodes()) {
    const filePath = getFilePathFromHeader(header);
    if (!filePath) {
      continue;
    }

    const hasLocate = Boolean(header.querySelector(`.${BUTTON_CLASS}`));
    const hasEditor = Boolean(header.querySelector(`.${EDITOR_BUTTON_CLASS}`));

    let locateButton = header.querySelector<HTMLElement>(`.${BUTTON_CLASS}`);
    if (!hasLocate) {
      const created = createLocateButton(filePath);
      const copyButton = findCopyFileNameButton(header);
      if (copyButton?.parentNode) {
        copyButton.insertAdjacentElement("afterend", created);
      } else {
        const pathHeading = header.querySelector<HTMLElement>("h3");
        pathHeading?.insertAdjacentElement("afterend", created);
      }
      locateButton = created;
    }

    if (options.withEditorButton && !hasEditor && locateButton) {
      const editorButton = createEditorButton(filePath, header);
      locateButton.insertAdjacentElement("afterend", editorButton);
    }
  }
}

function removeInjectedButtons(): void {
  removeButtons(BUTTON_CLASS);
  removeButtons(EDITOR_BUTTON_CLASS);
}

function removeButtons(className: string): void {
  document
    .querySelectorAll<HTMLElement>(`.${className}`)
    .forEach((node) => node.remove());
}

function getCandidateHeaderNodes(): HTMLElement[] {
  const pathButtons = Array.from(
    document.querySelectorAll<HTMLElement>("[data-file-path]")
  );

  const headers = pathButtons
    .map(
      (node) =>
        node.closest<HTMLElement>(
          "[class*='DiffFileHeader-module__diff-file-header']"
        ) ??
        node.closest<HTMLElement>("[role='region']") ??
        node.parentElement
    )
    .filter((node): node is HTMLElement => node !== null);

  return Array.from(new Set(headers));
}

function getFilePathFromHeader(header: HTMLElement): FilePath | null {
  const explicitPathNode = header.querySelector<HTMLElement>(
    "[data-file-path]"
  );
  const datasetPath = explicitPathNode?.dataset["filePath"];
  if (datasetPath) {
    return normalizePath(datasetPath);
  }

  const code = header.querySelector<HTMLElement>("h3 code");
  if (code) {
    return normalizePath(code.textContent);
  }

  return null;
}
