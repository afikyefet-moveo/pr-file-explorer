import { createIconButton, setButtonState } from "../../shared/buttonFactory";
import {
  REVIEW_BUTTON_CLASS,
  REVIEW_RAIL_CLASS,
  REVIEW_STATUS_CLASS,
} from "../../shared/constants";
import {
  getCommentDownIconSvg,
  getCommentUpIconSvg,
  getCopyContextIconSvg,
  getUnviewedIconSvg,
} from "../../shared/icons";
import { installTooltip, updateTooltipText } from "../../shared/tooltip";
import type { FlashState, ReviewAction, ReviewStatusState } from "./types";

interface RailState {
  visible: boolean;
  currentStatus: {
    text: string;
    state: ReviewStatusState;
    tooltip: string;
  };
  previousComment: {
    visible: boolean;
    enabled: boolean;
    tooltip: string;
  };
  nextComment: {
    visible: boolean;
    enabled: boolean;
    tooltip: string;
  };
  nextUnviewed: {
    visible: boolean;
    enabled: boolean;
    tooltip: string;
  };
  copyContext: {
    visible: boolean;
    enabled: boolean;
    tooltip: string;
  };
}

export function createReviewRail(onClick: (action: ReviewAction, button: HTMLElement) => void): HTMLElement {
  const rail = document.createElement("div");
  rail.className = REVIEW_RAIL_CLASS;
  rail.dataset["visible"] = "false";
  rail.appendChild(createStatus());
  rail.appendChild(
    createRailButton("previous-comment", "Previous comment", getCommentUpIconSvg())
  );
  rail.appendChild(
    createRailButton("next-comment", "Next comment", getCommentDownIconSvg())
  );
  rail.appendChild(
    createRailButton("next-unviewed", "Next unviewed file", getUnviewedIconSvg())
  );
  rail.appendChild(
    createRailButton("copy-context", "Copy review context", getCopyContextIconSvg())
  );
  rail.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      `.${REVIEW_BUTTON_CLASS}`
    );
    if (!button || (button as HTMLButtonElement).disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onClick(button.dataset["reviewAction"] as ReviewAction, button);
  });
  return rail;
}

export function applyRailState(rail: HTMLElement, state: RailState): void {
  rail.dataset["visible"] = state.visible ? "true" : "false";
  setButtonVisibility(
    rail.querySelector<HTMLButtonElement>("[data-review-action='previous-comment']"),
    state.previousComment.visible
  );
  setButtonVisibility(
    rail.querySelector<HTMLButtonElement>("[data-review-action='next-comment']"),
    state.nextComment.visible
  );
  setButtonVisibility(
    rail.querySelector<HTMLButtonElement>("[data-review-action='next-unviewed']"),
    state.nextUnviewed.visible
  );
  setButtonVisibility(
    rail.querySelector<HTMLButtonElement>("[data-review-action='copy-context']"),
    state.copyContext.visible
  );
  setButtonEnabled(
    rail.querySelector<HTMLButtonElement>("[data-review-action='previous-comment']"),
    state.previousComment.enabled,
    state.previousComment.tooltip
  );
  setButtonEnabled(
    rail.querySelector<HTMLButtonElement>("[data-review-action='next-comment']"),
    state.nextComment.enabled,
    state.nextComment.tooltip
  );
  setButtonEnabled(
    rail.querySelector<HTMLButtonElement>("[data-review-action='next-unviewed']"),
    state.nextUnviewed.enabled,
    state.nextUnviewed.tooltip
  );
  setButtonEnabled(
    rail.querySelector<HTMLButtonElement>("[data-review-action='copy-context']"),
    state.copyContext.enabled,
    state.copyContext.tooltip
  );
  setStatus(rail.querySelector<HTMLElement>(`.${REVIEW_STATUS_CLASS}`), state);
}

export function flashRailButton(
  button: HTMLElement,
  state: FlashState,
  title: string,
  onDone: () => void
): void {
  setButtonState(button, state);
  button.title = title;
  updateTooltipText(button, title);

  window.setTimeout(() => {
    setButtonState(button, "");
    onDone();
  }, 1400);
}

function createStatus(): HTMLElement {
  const status = document.createElement("span");
  status.className = REVIEW_STATUS_CLASS;
  status.textContent = "0";
  status.dataset["state"] = "none";
  installTooltip(status, "No comments in current file");
  return status;
}

function createRailButton(
  action: ReviewAction,
  label: string,
  iconSvg: string
): HTMLButtonElement {
  const button = createIconButton({
    variant: "default",
    ariaLabel: label,
    title: label,
    extraClassName: REVIEW_BUTTON_CLASS,
    innerHtml: iconSvg,
    dataset: { reviewAction: action },
  });

  installTooltip(button, label);
  return button;
}

function setButtonVisibility(
  button: HTMLButtonElement | null,
  visible: boolean
): void {
  if (!button) {
    return;
  }

  button.hidden = !visible;
}

function setButtonEnabled(
  button: HTMLButtonElement | null,
  enabled: boolean,
  tooltip: string
): void {
  if (!button) {
    return;
  }

  button.disabled = button.hidden || !enabled;
  button.title = tooltip;
  updateTooltipText(button, tooltip);
}

function setStatus(status: HTMLElement | null, state: RailState): void {
  if (!status) {
    return;
  }

  status.textContent = state.currentStatus.text;
  status.dataset["state"] = state.currentStatus.state;
  updateTooltipText(status, state.currentStatus.tooltip);
}

export type { RailState };
