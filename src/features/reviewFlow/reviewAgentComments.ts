import { normalizePath, type FilePath } from "../../shared/dom";
import { copyText } from "../editor/editorCommand";
import { getFilePathFromRegion, getUnresolvedCommentTargets } from "./reviewDom";
import type { CommentTarget } from "./types";

interface AgentComment {
  filePath: FilePath;
  lineLabel: string;
  url: string;
  author: string;
  body: string;
  isCodeRabbit: boolean;
  codeRabbitCategory: string;
  codeRabbitAgentPrompt: string;
  codeRabbitSuggestedFix: string;
}

const COMMENT_BODY_SELECTOR = [
  "[data-testid='comment-body']",
  "[data-testid='review-comment-body']",
  ".comment-body",
  ".markdown-body",
].join(", ");

const REMOVE_FROM_COMMENT_SELECTOR = [
  "button",
  "svg",
  "relative-time",
  "tool-tip",
  "clipboard-copy",
  "input",
  "textarea",
  "select",
  "template",
  "[role='tooltip']",
  "[aria-hidden='true']",
  ".sr-only",
  ".js-comment-edit-button",
].join(", ");

const CONTROL_LINE_PATTERN =
  /^(copy link|delete|edit|hide details|quote reply|react|reply|report content|resolve conversation|show details|unresolve conversation)$/i;

export async function copyUnresolvedCommentsForAgent(): Promise<number> {
  const comments = getUnresolvedCommentTargets().map(buildAgentComment);
  if (!comments.length) {
    return 0;
  }

  await copyText(buildAgentPrompt(comments));
  return comments.length;
}

function buildAgentComment(target: CommentTarget): AgentComment {
  const body = getCommentText(target.element);
  const author = getThreadAuthor(target.element);
  const isCodeRabbit = isCodeRabbitComment(author, body, target.element);

  return {
    filePath: getFilePathFromRegion(target.region) ?? normalizePath(""),
    lineLabel: formatLineLabel(getThreadLineNumber(target)),
    url: getThreadUrl(target),
    author,
    body,
    isCodeRabbit,
    codeRabbitCategory: isCodeRabbit ? inferCodeRabbitCategory(body) : "",
    codeRabbitAgentPrompt: isCodeRabbit
      ? extractSection(body, ["prompt for ai agents", "prompt for ai agent"], [
          "suggested fix",
          "suggested change",
          "details",
          "review details",
          "walkthrough",
        ])
      : "",
    codeRabbitSuggestedFix: isCodeRabbit
      ? extractSection(body, ["suggested fix", "suggested change"], [
          "prompt for ai agents",
          "prompt for ai agent",
          "details",
          "review details",
          "walkthrough",
        ])
      : "",
  };
}

function buildAgentPrompt(comments: AgentComment[]): string {
  const codeRabbitCount = comments.filter((comment) => comment.isCodeRabbit).length;
  const lines = [
    "# Address unresolved PR review comments",
    "",
    "Please address the unresolved review comments below.",
    "",
    "Important instructions:",
    "- The comments were copied from the rendered GitHub PR files page; unresolved comments that GitHub has not rendered may be missing.",
    "- Treat each regular reviewer comment as direct review feedback.",
    "- For CodeRabbit comments, verify the suggestion against the code before changing anything. Implement only correct and actionable findings.",
    "- If a CodeRabbit recommendation is incorrect, obsolete, duplicated, or unsafe, skip it and briefly explain why.",
    "- Preserve existing behavior unless a comment explicitly asks for a behavior change.",
    "- After making changes, summarize which comments were addressed and which were skipped.",
    "",
    `PR: ${getCurrentPrUrl()}`,
    `Rendered unresolved comments: ${comments.length}`,
    `CodeRabbit comments: ${codeRabbitCount}`,
    `Regular reviewer comments: ${comments.length - codeRabbitCount}`,
    "",
  ];

  let globalIndex = 1;
  for (const [filePath, fileComments] of groupByFile(comments)) {
    lines.push(`## ${filePath || "Unknown file"}`, "");

    for (const comment of fileComments) {
      const source = comment.isCodeRabbit ? "CodeRabbit" : "Reviewer";
      const location = comment.lineLabel || "File-level or unknown line";
      lines.push(`### ${globalIndex}. ${location} - ${source}`);
      lines.push(`Author: ${comment.author}`);
      lines.push(`Link: ${comment.url}`);

      if (comment.isCodeRabbit) {
        lines.push("CodeRabbit handling:");
        lines.push(
          `- Category: ${comment.codeRabbitCategory || "unclassified suggestion"}`
        );
        lines.push("- Verify the finding before applying any generated patch.");
        lines.push("- Prefer the smallest correct code change.");
      }

      lines.push("", "Comment:", fencedBlock(comment.body));

      if (comment.codeRabbitAgentPrompt) {
        lines.push("", "CodeRabbit prompt for AI agents:", fencedBlock(comment.codeRabbitAgentPrompt));
      }

      if (comment.codeRabbitSuggestedFix) {
        lines.push("", "CodeRabbit suggested fix:", fencedBlock(comment.codeRabbitSuggestedFix));
      }

      lines.push("");
      globalIndex += 1;
    }
  }

  return lines.join("\n").trim();
}

function groupByFile(comments: AgentComment[]): Array<[string, AgentComment[]]> {
  const groups = new Map<string, AgentComment[]>();
  for (const comment of comments) {
    const key = comment.filePath || "Unknown file";
    groups.set(key, [...(groups.get(key) ?? []), comment]);
  }
  return Array.from(groups.entries());
}

function getCommentText(thread: HTMLElement): string {
  const bodyNodes = getCommentBodyNodes(thread);
  const texts = bodyNodes.length
    ? bodyNodes.map(getCleanText).filter(Boolean)
    : [getCleanText(thread)].filter(Boolean);

  return dedupe(texts).join("\n\n---\n\n") || "No extractable comment text.";
}

function getCommentBodyNodes(thread: HTMLElement): HTMLElement[] {
  const nodes = Array.from(thread.querySelectorAll<HTMLElement>(COMMENT_BODY_SELECTOR));
  return nodes.filter(
    (node) => !nodes.some((candidate) => candidate !== node && candidate.contains(node))
  );
}

function getCleanText(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll<HTMLElement>(REMOVE_FROM_COMMENT_SELECTOR)
    .forEach((element) => element.remove());

  return normalizeCommentText(clone.textContent ?? "");
}

function normalizeCommentText(text: string): string {
  return text
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\b(Resolve conversation|Unresolve conversation|Quote reply|Copy link)\b/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .filter((line) => !CONTROL_LINE_PATTERN.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getThreadAuthor(thread: HTMLElement): string {
  const candidates = Array.from(
    thread.querySelectorAll<HTMLElement>(
      [
        "a.author",
        "a[data-hovercard-type='user']",
        "a[data-hovercard-url*='/users/']",
        "[data-login]",
      ].join(", ")
    )
  );

  for (const candidate of candidates) {
    const login = normalizeInlineText(
      candidate.getAttribute("data-login") ??
        candidate.textContent ??
        candidate.getAttribute("aria-label") ??
        ""
    );
    if (login) {
      return login;
    }
  }

  return "Unknown reviewer";
}

function getThreadLineNumber(target: CommentTarget): string {
  const hashLine = getThreadHash(target.element)?.match(/R(\d+)/)?.[1];
  if (hashLine) {
    return hashLine;
  }

  const nestedLine = getLineNumberInside(target.element);
  if (nestedLine) {
    return nestedLine;
  }

  let row = target.element.closest<HTMLElement>("tr");
  for (let index = 0; row && index < 8; index += 1) {
    const line = getLineNumberInside(row);
    if (line) {
      return line;
    }
    row = row.previousElementSibling as HTMLElement | null;
  }

  return "";
}

function getLineNumberInside(element: HTMLElement): string {
  const cells = Array.from(
    element.querySelectorAll<HTMLElement>("[data-line-number][data-diff-side='right']")
  );
  const withLine = cells.find((cell) => normalizePath(cell.dataset["lineNumber"]));
  return withLine ? normalizePath(withLine.dataset["lineNumber"]) : "";
}

function formatLineLabel(lineNumber: string): string {
  return lineNumber ? `R${lineNumber}` : "";
}

function getThreadUrl(target: CommentTarget): string {
  const url = new URL(window.location.href);
  const hash = getThreadHash(target.element);
  const lineNumber = getThreadLineNumber(target);
  url.hash = hash ?? (lineNumber ? `${target.region.id}R${lineNumber}` : target.region.id);
  return url.toString();
}

function getThreadHash(thread: HTMLElement): string | null {
  const anchors = Array.from(thread.querySelectorAll<HTMLAnchorElement>("a[href*='#diff-']"));
  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") ?? "";
    const match = href.match(/#(diff-[^\s"'<>]+)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  const anchorNode = thread.querySelector<HTMLElement>("[data-line-anchor^='diff-']");
  return anchorNode?.dataset["lineAnchor"] ?? null;
}

function isCodeRabbitComment(
  author: string,
  body: string,
  thread: HTMLElement
): boolean {
  const combined = `${author} ${body} ${thread.textContent ?? ""}`.toLowerCase();
  return combined.includes("coderabbit") || combined.includes("code rabbit");
}

function inferCodeRabbitCategory(body: string): string {
  const lower = body.toLowerCase();
  const categories: Array<[string, string]> = [
    ["security", "security"],
    ["potential issue", "potential issue"],
    ["bug", "bug risk"],
    ["performance", "performance"],
    ["nitpick", "nitpick"],
    ["suggestion", "suggestion"],
    ["suggested", "suggestion"],
    ["style", "style"],
  ];

  return categories.find(([needle]) => lower.includes(needle))?.[1] ?? "";
}

function extractSection(
  text: string,
  starts: string[],
  stops: string[]
): string {
  const lines = text.split("\n");
  const startIndex = lines.findIndex((line) => matchesSectionLabel(line, starts));
  if (startIndex < 0) {
    return "";
  }

  const collected: string[] = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (collected.length && matchesSectionLabel(line, stops)) {
      break;
    }
    collected.push(line);
  }

  return collected.join("\n").trim();
}

function matchesSectionLabel(line: string, labels: string[]): boolean {
  const normalized = line
    .replace(/^#{1,6}\s*/, "")
    .replace(/:+$/, "")
    .trim()
    .toLowerCase();
  return labels.some((label) => normalized.includes(label));
}

function getCurrentPrUrl(): string {
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

function fencedBlock(text: string): string {
  const fence = getFence(text);
  return [fence, text, fence].join("\n");
}

function getFence(text: string): string {
  const longestRun = Math.max(
    2,
    ...Array.from(text.matchAll(/`+/g)).map((match) => match[0].length)
  );
  return "`".repeat(longestRun + 1);
}

function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function dedupe(values: string[]): string[] {
  return values.filter((value, index, list) => list.indexOf(value) === index);
}
