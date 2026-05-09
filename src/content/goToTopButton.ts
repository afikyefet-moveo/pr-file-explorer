import { createIconButton } from "../shared/buttonFactory";
import {
  TOP_BUTTON_CLASS,
  TOP_BUTTON_VISIBLE_OFFSET,
} from "../shared/constants";
import { getGoToTopIconSvg } from "../shared/icons";
import { getFilesTopScrollY } from "../shared/stickyHeader";
import { installTooltip, updateTooltipText } from "../shared/tooltip";
import type { ScrollTarget } from "../shared/settings";

export interface GoToTopBindings {
  click: ScrollTarget;
  shiftClick: ScrollTarget;
}

export interface GoToTopController {
  setBindings(next: GoToTopBindings): void;
  uninstall(): void;
}

export function installGoToTopButton(
  bindings: GoToTopBindings
): GoToTopController | null {
  if (document.querySelector(`.${TOP_BUTTON_CLASS}`)) {
    return null;
  }

  let current = bindings;
  const tooltip = describeBindings(current);

  const button = createIconButton({
    variant: "default",
    ariaLabel: "Back to top",
    title: tooltip,
    extraClassName: TOP_BUTTON_CLASS,
    innerHtml: getGoToTopIconSvg(),
  });

  installTooltip(button, tooltip);
  const handleClick = (event: MouseEvent): void => {
    const target = event.shiftKey ? current.shiftClick : current.click;
    scrollTo(target);
  };
  button.addEventListener("click", handleClick);

  document.body.appendChild(button);
  updateGoToTopVisibility(button);

  const onScroll = (): void => updateGoToTopVisibility(button);
  window.addEventListener("scroll", onScroll, { passive: true });

  return {
    setBindings(next) {
      current = next;
      const text = describeBindings(next);
      button.title = text;
      updateTooltipText(button, text);
    },
    uninstall() {
      button.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", onScroll);
      button.remove();
    },
  };
}

export function uninstallGoToTopButton(): void {
  const existing = document.querySelector<HTMLElement>(`.${TOP_BUTTON_CLASS}`);
  existing?.remove();
}

function describeBindings(bindings: GoToTopBindings): string {
  return `Back to ${labelFor(bindings.click)}. Shift-click for ${labelFor(
    bindings.shiftClick
  )}.`;
}

function labelFor(target: ScrollTarget): string {
  return target === "pageTop" ? "page top" : "top of files";
}

function updateGoToTopVisibility(button: HTMLElement): void {
  button.dataset["visible"] = shouldShowGoToTopButton() ? "true" : "false";
}

function shouldShowGoToTopButton(): boolean {
  const targetTop = getFilesTopScrollY();
  return window.scrollY > targetTop + TOP_BUTTON_VISIBLE_OFFSET;
}

function scrollTo(target: ScrollTarget): void {
  window.scrollTo({
    top: target === "pageTop" ? 0 : getFilesTopScrollY(),
    behavior: "smooth",
  });
}
