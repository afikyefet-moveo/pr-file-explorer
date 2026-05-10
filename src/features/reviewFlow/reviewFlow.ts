import { REVIEW_RAIL_CLASS } from "../../shared/constants";
import { debugLog, safely } from "../../shared/diagnostics";
import { clearCommentBadges, markFilesWithComments } from "./commentBadges";
import { copyUnresolvedCommentsForAgent } from "./reviewAgentComments";
import { copyReviewContextForRegion } from "./reviewContext";
import {
  getCommentTargets,
  getCommentTargetsForRegion,
  getCurrentDiffRegion,
  getDiffRegions,
  getUnresolvedCommentTargets,
  getUnviewedRegions,
  hasUnresolvedThread,
} from "./reviewDom";
import {
  findNextElementByViewport,
  findPreviousElementByViewport,
  scrollToElement,
} from "./reviewNavigation";
import {
  applyRailState,
  createReviewRail,
  flashRailButton,
  type RailState,
} from "./reviewRail";
import type { ReviewAction, ReviewRailControls } from "./types";

let railScrollListener: (() => void) | null = null;
let railControls: ReviewRailControls = {
  previousComment: true,
  nextComment: true,
  nextUnviewed: true,
  copyContext: true,
  copyCommentsToAgent: true,
};

export function installReviewFlowRail(controls: ReviewRailControls): void {
  railControls = controls;

  const existing = document.querySelector(`.${REVIEW_RAIL_CLASS}`);
  if (existing) {
    ensureRailScrollListener();
    return;
  }

  const rail = createReviewRail(onRailAction);
  document.body.appendChild(rail);

  ensureRailScrollListener();
  debugLog("review flow rail installed");
}

function ensureRailScrollListener(): void {
  if (railScrollListener) {
    return;
  }

  railScrollListener = () => refreshReviewFlow();
  window.addEventListener("scroll", railScrollListener, { passive: true });
}

export function refreshReviewFlow(controls?: ReviewRailControls): void {
  if (controls) {
    railControls = controls;
  }

  safely("refresh review flow", () => {
    const rail = document.querySelector<HTMLElement>(`.${REVIEW_RAIL_CLASS}`);
    if (rail) {
      applyRailState(rail, getRailState(railControls));
    }

    markFilesWithComments();
  });
}

export function uninstallReviewFlowRail(): void {
  const rail = document.querySelector<HTMLElement>(`.${REVIEW_RAIL_CLASS}`);
  rail?.remove();

  if (railScrollListener) {
    window.removeEventListener("scroll", railScrollListener);
    railScrollListener = null;
  }

  clearCommentBadges();
  debugLog("review flow rail uninstalled");
}

function getRailState(controls: ReviewRailControls): RailState {
  const currentRegion = getCurrentDiffRegion();
  const commentTargets = getCommentTargets();
  const unresolvedCommentTargets = getUnresolvedCommentTargets();
  const unviewedRegions = getUnviewedRegions();
  const hasComments = commentTargets.length > 0;
  const unresolvedCommentCount = unresolvedCommentTargets.length;

  return {
    visible: getDiffRegions().length > 0,
    currentStatus: getCurrentStatus(currentRegion),
    previousComment: {
      visible: controls.previousComment,
      enabled: hasComments,
      tooltip: hasComments ? "Previous comment" : "No comments",
    },
    nextComment: {
      visible: controls.nextComment,
      enabled: hasComments,
      tooltip: hasComments ? "Next comment" : "No comments",
    },
    nextUnviewed: {
      visible: controls.nextUnviewed,
      enabled: unviewedRegions.length > 0,
      tooltip: unviewedRegions.length ? "Next unviewed file" : "No unviewed files",
    },
    copyContext: {
      visible: controls.copyContext,
      enabled: Boolean(currentRegion),
      tooltip: currentRegion ? "Copy review context" : "No current file",
    },
    copyCommentsToAgent: {
      visible: controls.copyCommentsToAgent,
      enabled: unresolvedCommentCount > 0,
      tooltip: unresolvedCommentCount
        ? `Copy ${unresolvedCommentCount} unresolved comments to agent`
        : "No unresolved comments",
    },
  };
}

function getCurrentStatus(region: HTMLElement | null): RailState["currentStatus"] {
  if (!region) {
    return { text: "0", state: "none", tooltip: "No current file" };
  }

  if (hasUnresolvedThread(region)) {
    return {
      text: "!",
      state: "unresolved",
      tooltip: "Current file has unresolved review threads",
    };
  }

  if (getCommentTargetsForRegion(region).length) {
    return {
      text: "C",
      state: "comments",
      tooltip: "Current file has review comments",
    };
  }

  return { text: "0", state: "none", tooltip: "No comments in current file" };
}

function onRailAction(action: ReviewAction, button: HTMLElement): void {
  if (action === "previous-comment") {
    jumpToPreviousComment(button);
  } else if (action === "next-comment") {
    jumpToNextComment(button);
  } else if (action === "next-unviewed") {
    jumpToNextUnviewedFile(button);
  } else if (action === "copy-context") {
    void copyReviewContext(button);
  } else if (action === "copy-comments-to-agent") {
    void copyCommentsToAgent(button);
  }
}

function jumpToPreviousComment(button: HTMLElement): void {
  const elements = getCommentTargets().map((target) => target.element);
  const previous = findPreviousElementByViewport(elements) ?? elements.at(-1);
  if (!previous) {
    return;
  }

  scrollToElement(previous);
  flashRailButton(
    button,
    "copied",
    "Jumped to previous comment",
    refreshReviewFlow
  );
}

function jumpToNextComment(button: HTMLElement): void {
  const elements = getCommentTargets().map((target) => target.element);
  const next = findNextElementByViewport(elements) ?? elements[0];
  if (!next) {
    return;
  }

  scrollToElement(next);
  flashRailButton(button, "copied", "Jumped to next comment", refreshReviewFlow);
}

function jumpToNextUnviewedFile(button: HTMLElement): void {
  const regions = getUnviewedRegions();
  const next = findNextElementByViewport(regions) ?? regions[0];
  if (!next) {
    return;
  }

  scrollToElement(next);
  flashRailButton(button, "copied", "Jumped to next unviewed file", refreshReviewFlow);
}

async function copyReviewContext(button: HTMLElement): Promise<void> {
  const region = getCurrentDiffRegion();
  if (!region) {
    flashRailButton(button, "error", "No current file", refreshReviewFlow);
    return;
  }

  try {
    await copyReviewContextForRegion(region);
    flashRailButton(button, "copied", "Copied review context", refreshReviewFlow);
  } catch {
    flashRailButton(button, "error", "Could not copy review context", refreshReviewFlow);
  }
}

async function copyCommentsToAgent(button: HTMLElement): Promise<void> {
  try {
    const count = await copyUnresolvedCommentsForAgent();
    if (!count) {
      flashRailButton(button, "error", "No unresolved comments", refreshReviewFlow);
      return;
    }

    flashRailButton(
      button,
      "copied",
      `Copied ${count} unresolved comments`,
      refreshReviewFlow
    );
  } catch {
    flashRailButton(
      button,
      "error",
      "Could not copy unresolved comments",
      refreshReviewFlow
    );
  }
}
