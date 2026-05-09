import { normalizePath } from "../../shared/dom";
import { copyText } from "../editor/editorCommand";
import {
  getFilePathFromRegion,
  getFirstVisibleRightSideLine,
  getSelectedRightSideLines,
} from "./reviewDom";
import type { ReviewContext } from "./types";

export async function copyReviewContextForRegion(
  region: HTMLElement
): Promise<void> {
  await copyText(buildReviewContextMarkdown(getReviewContext(region)));
}

function getReviewContext(region: HTMLElement): ReviewContext {
  const selectedLines = getSelectedRightSideLines(region);
  const visibleLine = getFirstVisibleRightSideLine(region);
  const lineNumbers = selectedLines.length ? selectedLines : visibleLine ? [visibleLine] : [];
  const filePath = getFilePathFromRegion(region) ?? normalizePath("");

  return {
    filePath,
    lineLabel: formatLineLabel(lineNumbers),
    selectedText: getSelectedTextInsideRegion(region),
    url: buildReviewContextUrl(region, lineNumbers[0]),
  };
}

function getSelectedTextInsideRegion(region: HTMLElement): string {
  const selection = window.getSelection?.();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return "";
  }

  const anchorNode = selection.anchorNode;
  const focusNode = selection.focusNode;
  if (!anchorNode || !focusNode) {
    return "";
  }

  if (!region.contains(anchorNode) || !region.contains(focusNode)) {
    return "";
  }

  return selection.toString().trim();
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

function buildReviewContextUrl(
  region: HTMLElement,
  lineNumber: string | undefined
): string {
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
