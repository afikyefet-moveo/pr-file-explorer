export type IconName =
  | "locate"
  | "editor"
  | "goToTop"
  | "comment"
  | "unviewed"
  | "copyContext"
  | "pin"
  | "close";

const LOCATE_ICON_SVG = [
  '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
  ' class="octicon octicon-location" viewBox="0 0 16 16" width="16" height="16"',
  ' fill="currentColor" display="inline-block" overflow="visible"',
  ' style="vertical-align: text-bottom;">',
  '<path d="M8 1.25a6.75 6.75 0 0 0-6.75 6.75.75.75 0 0 0 1.5 0 5.25 5.25 0 1 1 5.25 5.25.75.75 0 0 0 0 1.5A6.75 6.75 0 0 0 8 1.25Z"></path>',
  '<path d="M8 4.75A3.25 3.25 0 1 0 8 11.25 3.25 3.25 0 0 0 8 4.75Zm0 1.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z"></path>',
  '<path d="M8.75.75a.75.75 0 0 0-1.5 0v2a.75.75 0 0 0 1.5 0v-2Zm0 12.5a.75.75 0 0 0-1.5 0v2a.75.75 0 0 0 1.5 0v-2ZM.75 7.25a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Zm12.5 0a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Z"></path>',
  "</svg>",
].join("");

const EDITOR_ICON_SVG = [
  '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
  ' class="octicon octicon-terminal" viewBox="0 0 16 16" width="16" height="16"',
  ' fill="currentColor" display="inline-block" overflow="visible"',
  ' style="vertical-align: text-bottom;">',
  '<path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25Z"></path>',
  '<path d="M3.72 4.72a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-2 2a.749.749 0 1 1-1.06-1.06L5.19 7.25 3.72 5.78a.75.75 0 0 1 0-1.06ZM8.75 9.5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5Z"></path>',
  "</svg>",
].join("");

const GO_TO_TOP_ICON_SVG = [
  '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
  ' class="octicon octicon-arrow-up" viewBox="0 0 16 16" width="16" height="16"',
  ' fill="currentColor" display="inline-block" overflow="visible"',
  ' style="vertical-align: text-bottom;">',
  '<path d="M3.47 7.78a.75.75 0 0 0 1.06 0L7.25 5.06v8.19a.75.75 0 0 0 1.5 0V5.06l2.72 2.72a.749.749 0 1 0 1.06-1.06L8.53 2.72a.749.749 0 0 0-1.06 0L3.47 6.72a.75.75 0 0 0 0 1.06Z"></path>',
  "</svg>",
].join("");

const COMMENT_ICON_SVG = [
  '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
  ' class="octicon octicon-comment-discussion" viewBox="0 0 16 16" width="16" height="16"',
  ' fill="currentColor" display="inline-block" overflow="visible"',
  ' style="vertical-align: text-bottom;">',
  '<path d="M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.458 1.458 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1Zm0 1.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25Z"></path>',
  '<path d="M14.25 4h-.75v1.5h.75c.138 0 .25.112.25.25v5.5a.25.25 0 0 1-.25.25h-1a.75.75 0 0 0-.75.75v1.19l-1.72-1.72a.749.749 0 0 0-.53-.22H6.5v1.5h3.439l1.574 1.573A1.458 1.458 0 0 0 14 13.543V13h.25A1.75 1.75 0 0 0 16 11.25v-5.5A1.75 1.75 0 0 0 14.25 4Z"></path>',
  "</svg>",
].join("");

const UNVIEWED_ICON_SVG = [
  '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
  ' class="octicon octicon-eye" viewBox="0 0 16 16" width="16" height="16"',
  ' fill="currentColor" display="inline-block" overflow="visible"',
  ' style="vertical-align: text-bottom;">',
  '<path d="M8 2c2.878 0 5.378 1.621 6.635 4.001a.75.75 0 0 1 0 .698C13.378 9.079 10.878 10.7 8 10.7S2.622 9.079 1.365 6.699a.75.75 0 0 1 0-.698C2.622 3.621 5.122 2 8 2Zm0 1.5c-2.105 0-4.026 1.092-5.092 2.85C3.974 8.108 5.895 9.2 8 9.2s4.026-1.092 5.092-2.85C12.026 4.592 10.105 3.5 8 3.5Z"></path>',
  '<path d="M8 4.5a1.85 1.85 0 1 1 0 3.7 1.85 1.85 0 0 1 0-3.7Z"></path>',
  "</svg>",
].join("");

const COPY_CONTEXT_ICON_SVG = [
  '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
  ' class="octicon octicon-copy" viewBox="0 0 16 16" width="16" height="16"',
  ' fill="currentColor" display="inline-block" overflow="visible"',
  ' style="vertical-align: text-bottom;">',
  '<path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>',
  '<path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>',
  "</svg>",
].join("");

const PIN_ICON_SVG = [
  '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
  ' class="octicon octicon-pin" viewBox="0 0 16 16" width="16" height="16"',
  ' fill="currentColor" display="inline-block" overflow="visible"',
  ' style="vertical-align: text-bottom;">',
  '<path d="M10.561 1.5a.016.016 0 0 0-.01.004L7.286 4.77a.749.749 0 0 1-.53.22H4.19a.25.25 0 0 0-.177.427l2.283 2.283-4.073 4.073a.75.75 0 1 0 1.06 1.06l4.073-4.073 2.283 2.283a.25.25 0 0 0 .427-.177V8.3a.75.75 0 0 1 .22-.53l3.265-3.265a.016.016 0 0 0 .004-.01.25.25 0 0 0-.073-.177L10.738 1.573a.25.25 0 0 0-.177-.073Zm-1.071-1.06a1.5 1.5 0 0 1 2.309.073l2.744 2.744a1.5 1.5 0 0 1 .073 2.309L11.57 8.612v2.254A1.75 1.75 0 0 1 8.582 12.1L3.418 6.936A1.75 1.75 0 0 1 4.19 3.49h2.254Z"></path>',
  "</svg>",
].join("");

const CLOSE_ICON_SVG = [
  '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
  ' class="octicon octicon-x" viewBox="0 0 16 16" width="16" height="16"',
  ' fill="currentColor" display="inline-block" overflow="visible"',
  ' style="vertical-align: text-bottom;">',
  '<path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.06 1.06L9.06 8l3.22 3.22a.749.749 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.749.749 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>',
  "</svg>",
].join("");

export function getIconSvg(name: IconName): string {
  switch (name) {
    case "locate":
      return LOCATE_ICON_SVG;
    case "editor":
      return EDITOR_ICON_SVG;
    case "goToTop":
      return GO_TO_TOP_ICON_SVG;
    case "comment":
      return COMMENT_ICON_SVG;
    case "unviewed":
      return UNVIEWED_ICON_SVG;
    case "copyContext":
      return COPY_CONTEXT_ICON_SVG;
    case "pin":
      return PIN_ICON_SVG;
    case "close":
      return CLOSE_ICON_SVG;
  }
}

export const getLocateIconSvg = (): string => getIconSvg("locate");
export const getEditorIconSvg = (): string => getIconSvg("editor");
export const getGoToTopIconSvg = (): string => getIconSvg("goToTop");
export const getCommentIconSvg = (): string => getIconSvg("comment");
export const getUnviewedIconSvg = (): string => getIconSvg("unviewed");
export const getCopyContextIconSvg = (): string => getIconSvg("copyContext");
export const getPinIconSvg = (): string => getIconSvg("pin");
export const getCloseIconSvg = (): string => getIconSvg("close");
