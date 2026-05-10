import { REVIEW_RAIL_CLASS } from "../../shared/constants";
import { debugLog, safely } from "../../shared/diagnostics";
import { clearCommentBadges, markFilesWithComments } from "./commentBadges";
import { copyReviewContextForRegion } from "./reviewContext";
import {
  getCommentTargets,
  getCommentTargetsForRegion,
  getCurrentDiffRegion,
  getDiffRegions,
  getUnviewedRegions,
  hasUnresolvedThread,
} from "./reviewDom";
import { findNextElementByViewport, scrollToElement } from "./reviewNavigation";
import {
  applyRailState,
  createReviewRail,
  flashRailButton,
  type RailState,
} from "./reviewRail";
import type { ReviewAction } from "./types";

let railScrollListener: (() => void) | null = null;

export function installReviewFlowRail(): void {
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

export function refreshReviewFlow(): void {
  safely("refresh review flow", () => {
    const rail = document.querySelector<HTMLElement>(`.${REVIEW_RAIL_CLASS}`);
    if (rail) {
      applyRailState(rail, getRailState());
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

function getRailState(): RailState {
  const currentRegion = getCurrentDiffRegion();
  const commentTargets = getCommentTargets();
  const unviewedRegions = getUnviewedRegions();

  return {
    visible: getDiffRegions().length > 0,
    currentStatus: getCurrentStatus(currentRegion),
    nextComment: {
      enabled: commentTargets.length > 0,
      tooltip: commentTargets.length ? "Next comment" : "No comments",
    },
    nextUnviewed: {
      enabled: unviewedRegions.length > 0,
      tooltip: unviewedRegions.length ? "Next unviewed file" : "No unviewed files",
    },
    copyContext: {
      enabled: Boolean(currentRegion),
      tooltip: currentRegion ? "Copy review context" : "No current file",
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
  if (action === "next-comment") {
    jumpToNextComment(button);
  } else if (action === "next-unviewed") {
    jumpToNextUnviewedFile(button);
  } else if (action === "copy-context") {
    void copyReviewContext(button);
  }
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
