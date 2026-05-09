import { TOOLTIP_CLASS, TOOLTIP_ID } from "./constants";

const TOOLTIP_DATASET_KEY = "prFileExplorerTooltip";

export function installTooltip(element: HTMLElement, text: string): void {
  element.dataset[TOOLTIP_DATASET_KEY] = text;
  element.setAttribute("aria-describedby", TOOLTIP_ID);
  element.addEventListener("mouseenter", showTooltipForElement);
  element.addEventListener("focus", showTooltipForElement);
  element.addEventListener("mouseleave", hideTooltip);
  element.addEventListener("blur", hideTooltip);
  element.addEventListener("mousedown", hideTooltip);
}

export function updateTooltipText(element: HTMLElement, text: string): void {
  element.dataset[TOOLTIP_DATASET_KEY] = text;
}

export function hideTooltip(): void {
  const tooltip = document.getElementById(TOOLTIP_ID);
  if (tooltip) {
    tooltip.dataset["visible"] = "false";
  }
}

function showTooltipForElement(event: Event): void {
  const element = event.currentTarget as HTMLElement | null;
  if (!element) {
    return;
  }

  const text = element.dataset[TOOLTIP_DATASET_KEY];
  if (!text) {
    return;
  }

  const tooltip = getTooltipElement();
  tooltip.textContent = text;
  tooltip.dataset["visible"] = "true";
  positionTooltip(tooltip, element);
}

function getTooltipElement(): HTMLElement {
  const existing = document.getElementById(TOOLTIP_ID);
  if (existing) {
    return existing;
  }

  const tooltip = document.createElement("div");
  tooltip.id = TOOLTIP_ID;
  tooltip.className = TOOLTIP_CLASS;
  tooltip.setAttribute("role", "tooltip");
  document.body.appendChild(tooltip);
  return tooltip;
}

function positionTooltip(tooltip: HTMLElement, target: HTMLElement): void {
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const gap = 8;
  let top = targetRect.top - tooltipRect.height - gap;

  if (top < gap) {
    top = targetRect.bottom + gap;
  }

  let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
  left = Math.max(gap, Math.min(left, viewportWidth - tooltipRect.width - gap));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}
