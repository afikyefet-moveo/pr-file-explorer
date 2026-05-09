import { createIconButton, setButtonState } from "../../shared/buttonFactory";
import {
  COMMENT_BADGE_CLASS,
  REVIEW_BUTTON_CLASS,
  REVIEW_RAIL_CLASS,
  REVIEW_STATUS_CLASS,
} from "../../shared/constants";
import { normalizePath, type FilePath } from "../../shared/dom";
import {
  getCommentIconSvg,
  getCopyContextIconSvg,
  getUnviewedIconSvg,
} from "../../shared/icons";
import { getStickyHeaderOffset } from "../../shared/stickyHeader";
import { installTooltip, updateTooltipText } from "../../shared/tooltip";
import { copyText } from "../editor/editorCommand";
import { findFileTreeItem } from "../locate/locateFile";

type ReviewAction = "next-comment" | "next-unviewed" | "copy-context";

interface CommentTarget {
  element: HTMLElement;
  region: HTMLElement;
}

interface ReviewContext {
  filePath: FilePath;
  lineLabel: string;
  selectedText: string;
  url: string;
}

let installed = false;
let railScrollListener: (() => void) | null = null;

export function installReviewFlowRail(): void {
  if (installed || document.querySelector(`.${REVIEW_RAIL_CLASS}`)) {
    installed = true;
    return;
  }

  const rail = document.createElement("div");
  rail.className = REVIEW_RAIL_CLASS;
  rail.dataset["visible"] = "false";

  const status = document.createElement("span");
  status.className = REVIEW_STATUS_CLASS;
  status.textContent = "0";
  status.dataset["state"] = "none";
  installTooltip(status, "No comments in current file");

  rail.appendChild(status);
  rail.appendChild(
    createRailButton("next-comment", "Next comment", getCommentIconSvg())
  );
  rail.appendChild(
    createRailButton("next-unviewed", "Next unviewed file", getUnviewedIconSvg())
  );
  rail.appendChild(
    createRailButton("copy-context", "Copy review context", getCopyContextIconSvg())
  );

  document.body.appendChild(rail);
  rail.addEventListener("click", onRailClick);

  railScrollListener = () => refreshReviewFlow();
  window.addEventListener("scroll", railScrollListener, { passive: true });
  installed = true;
}

export function refreshReviewFlow(): void {
  const rail = document.querySelector<HTMLElement>(`.${REVIEW_RAIL_CLASS}`);
  if (rail) {
    rail.dataset["visible"] = getDiffRegions().length ? "true" : "false";
    updateRailState(rail);
  }

  markFilesWithComments();
}

export function uninstallReviewFlowRail(): void {
  const rail = document.querySelector<HTMLElement>(`.${REVIEW_RAIL_CLASS}`);
  rail?.removeEventListener("click", onRailClick);
  rail?.remove();

  if (railScrollListener) {
    window.removeEventListener("scroll", railScrollListener);
    railScrollListener = null;
  }

  document
    .querySelectorAll<HTMLElement>(`.${COMMENT_BADGE_CLASS}`)
    .forEach((badge) => badge.remove());
  installed = false;
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

function onRailClick(event: Event): void {
  const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
    `.${REVIEW_BUTTON_CLASS}`
  );
  if (!button || button.disabled) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const action = button.dataset["reviewAction"] as ReviewAction | undefined;
  if (action === "next-comment") {
    jumpToNextComment(button);
  } else if (action === "next-unviewed") {
    jumpToNextUnviewedFile(button);
  } else if (action === "copy-context") {
    void copyReviewContext(button);
  }
}

function updateRailState(rail: HTMLElement): void {
  const currentRegion = getCurrentDiffRegion();
  const nextCommentButton = rail.querySelector<HTMLButtonElement>(
    "[data-review-action='next-comment']"
  );
  const nextUnviewedButton = rail.querySelector<HTMLButtonElement>(
    "[data-review-action='next-unviewed']"
  );
  const copyContextButton = rail.querySelector<HTMLButtonElement>(
    "[data-review-action='copy-context']"
  );

  const commentTargets = getCommentTargets();
  const unviewedRegions = getUnviewedRegions();
  setRailButtonState(
    nextCommentButton,
    commentTargets.length > 0,
    commentTargets.length ? "Next comment" : "No comments"
  );
  setRailButtonState(
    nextUnviewedButton,
    unviewedRegions.length > 0,
    unviewedRegions.length ? "Next unviewed file" : "No unviewed files"
  );
  setRailButtonState(
    copyContextButton,
    Boolean(currentRegion),
    currentRegion ? "Copy review context" : "No current file"
  );

  updateCurrentFileStatus(
    rail.querySelector<HTMLElement>(`.${REVIEW_STATUS_CLASS}`),
    currentRegion
  );
}

function setRailButtonState(
  button: HTMLButtonElement | null,
  enabled: boolean,
  tooltip: string
): void {
  if (!button) {
    return;
  }

  button.disabled = !enabled;
  button.title = tooltip;
  updateTooltipText(button, tooltip);
}

function updateCurrentFileStatus(
  status: HTMLElement | null,
  region: HTMLElement | null
): void {
  if (!status) {
    return;
  }

  if (!region) {
    setStatus(status, "0", "none", "No current file");
    return;
  }

  if (hasUnresolvedThread(region)) {
    setStatus(status, "!", "unresolved", "Current file has unresolved review threads");
    return;
  }

  if (getCommentTargetsForRegion(region).length) {
    setStatus(status, "C", "comments", "Current file has review comments");
    return;
  }

  setStatus(status, "0", "none", "No comments in current file");
}

function setStatus(
  status: HTMLElement,
  text: string,
  state: "none" | "comments" | "unresolved",
  tooltip: string
): void {
  status.textContent = text;
  status.dataset["state"] = state;
  updateTooltipText(status, tooltip);
}

function getDiffRegions(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[role='region'][id^='diff-']")
  ).filter((region) => Boolean(getFilePathFromRegion(region)));
}

function getCurrentDiffRegion(): HTMLElement | null {
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

function getFilePathFromRegion(region: HTMLElement): FilePath | null {
  const explicitPathNode = region.querySelector<HTMLElement>("[data-file-path]");
  const datasetPath = explicitPathNode?.dataset["filePath"];
  if (datasetPath) {
    return normalizePath(datasetPath);
  }

  const code = region.querySelector<HTMLElement>("h3 code");
  return code ? normalizePath(code.textContent) : null;
}

function getCommentTargets(): CommentTarget[] {
  const allTargets = getAllCommentTargets();
  const unresolvedTargets = allTargets.filter((target) =>
    isUnresolvedThread(target.element)
  );
  return unresolvedTargets.length ? unresolvedTargets : allTargets;
}

function getAllCommentTargets(): CommentTarget[] {
  const threadNodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-testid='review-thread'], [data-marker-navigation-comment-thread-id]"
    )
  );

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

function getCommentTargetsForRegion(region: HTMLElement): CommentTarget[] {
  return getAllCommentTargets().filter((target) => target.region === region);
}

function hasUnresolvedThread(region: HTMLElement): boolean {
  return getCommentTargetsForRegion(region).some((target) =>
    isUnresolvedThread(target.element)
  );
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

function jumpToNextComment(button: HTMLElement): void {
  const elements = getCommentTargets().map((target) => target.element);
  const next = findNextElementByViewport(elements) ?? elements[0];
  if (!next) {
    return;
  }

  scrollToElement(next);
  flashRailButton(button, "copied", "Jumped to next comment");
}

function jumpToNextUnviewedFile(button: HTMLElement): void {
  const regions = getUnviewedRegions();
  const next = findNextElementByViewport(regions) ?? regions[0];
  if (!next) {
    return;
  }

  scrollToElement(next);
  flashRailButton(button, "copied", "Jumped to next unviewed file");
}

function getUnviewedRegions(): HTMLElement[] {
  return getDiffRegions().filter((region) =>
    Boolean(
      region.querySelector("button[aria-label='Not Viewed']") ??
        Array.from(region.querySelectorAll<HTMLElement>("button[aria-pressed='false']")).find(
          (button) => normalizePath(button.textContent).includes("Viewed")
        )
    )
  );
}

function findNextElementByViewport(elements: HTMLElement[]): HTMLElement | null {
  const viewportTop = getStickyHeaderOffset();
  const next = elements
    .map((element) => ({
      element,
      top: element.getBoundingClientRect().top,
    }))
    .filter((entry) => entry.top > viewportTop + 24)
    .sort((a, b) => a.top - b.top)[0];

  return next?.element ?? null;
}

function scrollToElement(element: HTMLElement): void {
  const targetTop =
    element.getBoundingClientRect().top + window.scrollY - getStickyHeaderOffset() - 12;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}

async function copyReviewContext(button: HTMLElement): Promise<void> {
  const region = getCurrentDiffRegion();
  if (!region) {
    flashRailButton(button, "error", "No current file");
    return;
  }

  try {
    await copyText(buildReviewContextMarkdown(getReviewContext(region)));
    flashRailButton(button, "copied", "Copied review context");
  } catch {
    flashRailButton(button, "error", "Could not copy review context");
  }
}

function getReviewContext(region: HTMLElement): ReviewContext {
  const selectedLines = getSelectedRightSideLines(region);
  const visibleLine = getFirstVisibleRightSideLine(region);
  const lineNumbers = selectedLines.length ? selectedLines : visibleLine ? [visibleLine] : [];
  const filePath = getFilePathFromRegion(region) ?? normalizePath("");

  return {
    filePath,
    lineLabel: formatLineLabel(lineNumbers),
    selectedText: normalizeSelectedText(window.getSelection?.()?.toString() ?? ""),
    url: buildReviewContextUrl(region, lineNumbers[0]),
  };
}

function getSelectedRightSideLines(region: HTMLElement): string[] {
  return Array.from(
    region.querySelectorAll<HTMLElement>(
      "[data-line-number][data-diff-side='right'][data-selected='true']"
    )
  )
    .map((cell) => normalizePath(cell.getAttribute("data-line-number")))
    .filter(Boolean)
    .filter((line, index, list) => list.indexOf(line) === index)
    .sort((a, b) => Number(a) - Number(b));
}

function getFirstVisibleRightSideLine(region: HTMLElement): string {
  const cells = Array.from(
    region.querySelectorAll<HTMLElement>("[data-line-number][data-diff-side='right']")
  );
  const viewportTop = getStickyHeaderOffset();
  const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
  const visible = cells.find((cell) => {
    const rect = cell.getBoundingClientRect();
    return rect.bottom > viewportTop && rect.top < viewportBottom;
  });

  return visible ? normalizePath(visible.getAttribute("data-line-number")) : "";
}

function formatLineLabel(lines: string[]): string {
  if (!lines.length) {
    return "";
  }

  if (lines.length === 1) {
    return `R${lines[0]}`;
  }

  return `R${lines[0]}-R${lines[lines.length - 1]}`;
}

function buildReviewContextUrl(region: HTMLElement, lineNumber: string | undefined): string {
  const url = new URL(window.location.href);
  url.hash = lineNumber ? `${region.id}R${lineNumber}` : region.id;
  return url.toString();
}

function buildReviewContextMarkdown(context: ReviewContext): string {
  const lines = ["### Review context", "", `File: \`${context.filePath}\``];

  if (context.lineLabel) {
    lines.push(`Line: ${context.lineLabel}`);
  }

  lines.push(`PR: ${context.url}`);

  if (context.selectedText) {
    lines.push("", "Selected text:", "", "```", context.selectedText, "```");
  }

  return lines.join("\n");
}

function normalizeSelectedText(text: string): string {
  return text.trim();
}

function markFilesWithComments(): void {
  const commentedPaths = getCommentedFilePaths();
  document
    .querySelectorAll<HTMLElement>(`.${COMMENT_BADGE_CLASS}`)
    .forEach((badge) => {
      if (!commentedPaths.includes(badge.dataset["filePath"] as FilePath)) {
        badge.remove();
      }
    });

  for (const filePath of commentedPaths) {
    const treeItem = findFileTreeItem(filePath);
    if (!treeItem || treeItem.querySelector(`.${COMMENT_BADGE_CLASS}`)) {
      continue;
    }

    const textContainer =
      treeItem.querySelector<HTMLElement>("[class*='TreeViewItemContentText']") ??
      treeItem;
    const badge = document.createElement("span");
    badge.className = COMMENT_BADGE_CLASS;
    badge.dataset["filePath"] = filePath;
    badge.setAttribute("aria-label", "Has review comments");
    badge.title = "Has review comments";
    installTooltip(badge, "Has review comments");
    textContainer.appendChild(badge);
  }
}

function getCommentedFilePaths(): FilePath[] {
  return getAllCommentTargets()
    .map((target) => getFilePathFromRegion(target.region))
    .filter((path): path is FilePath => Boolean(path))
    .filter((path, index, list) => list.indexOf(path) === index);
}

function flashRailButton(
  button: HTMLElement,
  state: "copied" | "error",
  title: string
): void {
  setButtonState(button, state);
  button.title = title;
  updateTooltipText(button, title);

  window.setTimeout(() => {
    setButtonState(button, "");
    refreshReviewFlow();
  }, 1400);
}
