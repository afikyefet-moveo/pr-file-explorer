import {
  getDiffRegions as getSharedDiffRegions,
  getFilePathFromDiffRegion,
  getNotViewedButton,
  getReviewThreadNodes,
  getRightSideLineCells,
  getSelectedRightSideLineCells,
  normalizePath,
  type FilePath,
} from "../../shared/dom";
import { getStickyHeaderOffset } from "../../shared/stickyHeader";
import type { CommentTarget } from "./types";

export function getDiffRegions(): HTMLElement[] {
  return getSharedDiffRegions();
}

export function getCurrentDiffRegion(): HTMLElement | null {
  const viewportTop = getStickyHeaderOffset();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportMiddle = viewportTop + (viewportHeight - viewportTop) / 2;
  const regions = getDiffRegions();

  return (
    regions.find((region) => {
      const rect = region.getBoundingClientRect();
      return rect.top <= viewportMiddle && rect.bottom >= viewportMiddle;
    }) ??
    regions.find((region) => {
      const rect = region.getBoundingClientRect();
      return rect.bottom > viewportTop && rect.top < viewportHeight;
    }) ??
    null
  );
}

export function getFilePathFromRegion(region: HTMLElement): FilePath | null {
  return getFilePathFromDiffRegion(region);
}

export function getCommentTargets(): CommentTarget[] {
  const allTargets = getAllCommentTargets();
  const unresolvedTargets = getUnresolvedCommentTargets(allTargets);
  return unresolvedTargets.length ? unresolvedTargets : allTargets;
}

export function getUnresolvedCommentTargets(
  targets = getAllCommentTargets()
): CommentTarget[] {
  return targets.filter((target) => isUnresolvedThread(target.element));
}

export function getAllCommentTargets(): CommentTarget[] {
  const threadNodes = getReviewThreadNodes();

  const targets = threadNodes
    .map((node): CommentTarget | null => {
      const element =
        node.closest<HTMLElement>("[data-testid='review-thread']") ??
        node.closest<HTMLElement>("[data-marker-navigation-comment-thread-id]") ??
        node;
      const region = element.closest<HTMLElement>("[role='region'][id^='diff-']");
      return region ? { element, region } : null;
    })
    .filter((target): target is CommentTarget => target !== null);

  return targets.filter(
    (target, index) =>
      targets.findIndex((candidate) => candidate.element === target.element) ===
      index
  );
}

export function getCommentTargetsForRegion(region: HTMLElement): CommentTarget[] {
  return getAllCommentTargets().filter((target) => target.region === region);
}

export function hasUnresolvedThread(region: HTMLElement): boolean {
  return getCommentTargetsForRegion(region).some((target) =>
    isUnresolvedThread(target.element)
  );
}

export function getUnviewedRegions(): HTMLElement[] {
  return getDiffRegions().filter((region) => Boolean(getNotViewedButton(region)));
}

export function getSelectedRightSideLines(region: HTMLElement): string[] {
  return getSelectedRightSideLineCells(region)
    .map((cell) => normalizePath(cell.getAttribute("data-line-number")))
    .filter(Boolean)
    .filter((line, index, list) => list.indexOf(line) === index)
    .sort((a, b) => Number(a) - Number(b));
}

export function getFirstVisibleRightSideLine(region: HTMLElement): string {
  const cells = getRightSideLineCells(region);
  const viewportTop = getStickyHeaderOffset();
  const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
  const visible = cells.find((cell) => {
    const rect = cell.getBoundingClientRect();
    return rect.bottom > viewportTop && rect.top < viewportBottom;
  });

  return visible ? normalizePath(visible.getAttribute("data-line-number")) : "";
}

function isUnresolvedThread(thread: HTMLElement): boolean {
  return Array.from(thread.querySelectorAll<HTMLElement>("button, [role='button']")).some(
    (button) => {
      const label = normalizePath(
        button.getAttribute("aria-label") ??
          button.textContent ??
          button.getAttribute("title") ??
          ""
      ).toLowerCase();
      return label.includes("resolve") && !label.includes("unresolve");
    }
  );
}
