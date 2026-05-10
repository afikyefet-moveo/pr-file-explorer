import type { FilePath } from "../../shared/dom";

export type ReviewAction =
  | "previous-comment"
  | "next-comment"
  | "next-unviewed"
  | "copy-context";
export type ReviewStatusState = "none" | "comments" | "unresolved";
export type FlashState = "copied" | "error";

export interface ReviewRailControls {
  previousComment: boolean;
  nextComment: boolean;
  nextUnviewed: boolean;
  copyContext: boolean;
}

export interface CommentTarget {
  element: HTMLElement;
  region: HTMLElement;
}

export interface ReviewContext {
  filePath: FilePath;
  lineLabel: string;
  selectedText: string;
  url: string;
}
