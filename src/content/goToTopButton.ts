import { createIconButton } from "../shared/buttonFactory";
import {
  TOP_BUTTON_CLASS,
  TOP_BUTTON_VISIBLE_OFFSET,
} from "../shared/constants";
import { getGoToTopIconSvg } from "../shared/icons";
import { getFilesTopScrollY } from "../shared/stickyHeader";
import { installTooltip } from "../shared/tooltip";

const TOOLTIP_TEXT = "Back to top of files. Shift-click for page top.";

export function installGoToTopButton(): void {
  if (document.querySelector(`.${TOP_BUTTON_CLASS}`)) {
    return;
  }

  const button = createIconButton({
    variant: "default",
    ariaLabel: "Back to top of files",
    title: TOOLTIP_TEXT,
    extraClassName: TOP_BUTTON_CLASS,
    innerHtml: getGoToTopIconSvg(),
  });

  installTooltip(button, TOOLTIP_TEXT);
  button.addEventListener("click", (event) => {
    scrollBackToTop(event.shiftKey);
  });

  document.body.appendChild(button);
  updateGoToTopVisibility(button);
  window.addEventListener(
    "scroll",
    () => updateGoToTopVisibility(button),
    { passive: true }
  );
}

function updateGoToTopVisibility(button: HTMLElement): void {
  button.dataset["visible"] = shouldShowGoToTopButton() ? "true" : "false";
}

function shouldShowGoToTopButton(): boolean {
  const targetTop = getFilesTopScrollY();
  return window.scrollY > targetTop + TOP_BUTTON_VISIBLE_OFFSET;
}

function scrollBackToTop(usePageTop: boolean): void {
  window.scrollTo({
    top: usePageTop ? 0 : getFilesTopScrollY(),
    behavior: "smooth",
  });
}
