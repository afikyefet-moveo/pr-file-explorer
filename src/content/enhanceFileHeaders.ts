import { createEditorButton } from "../features/editor/editorButton";
import { createLocateButton } from "../features/locate/locateButton";
import { BUTTON_CLASS } from "../shared/constants";
import {
  findCopyFileNameButton,
  normalizePath,
  type FilePath,
} from "../shared/dom";

export interface EnhanceOptions {
  /** When true, an editor command icon is added next to the locate icon. */
  withEditorButton: boolean;
}

export function enhanceFileHeaders(options: EnhanceOptions): void {
  for (const header of getCandidateHeaderNodes()) {
    if (header.querySelector(`.${BUTTON_CLASS}`)) {
      continue;
    }

    const filePath = getFilePathFromHeader(header);
    if (!filePath) {
      continue;
    }

    const locateButton = createLocateButton(filePath);
    const editorButton = options.withEditorButton
      ? createEditorButton(filePath, header)
      : null;

    const copyButton = findCopyFileNameButton(header);
    if (copyButton?.parentNode) {
      copyButton.insertAdjacentElement("afterend", locateButton);
      if (editorButton) {
        locateButton.insertAdjacentElement("afterend", editorButton);
      }
      continue;
    }

    const pathHeading = header.querySelector<HTMLElement>("h3");
    if (pathHeading?.parentNode) {
      pathHeading.insertAdjacentElement("afterend", locateButton);
      if (editorButton) {
        locateButton.insertAdjacentElement("afterend", editorButton);
      }
    }
  }
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
