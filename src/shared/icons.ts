export type IconName = "locate" | "editor" | "goToTop";

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

export function getIconSvg(name: IconName): string {
  switch (name) {
    case "locate":
      return LOCATE_ICON_SVG;
    case "editor":
      return EDITOR_ICON_SVG;
    case "goToTop":
      return GO_TO_TOP_ICON_SVG;
  }
}

export const getLocateIconSvg = (): string => getIconSvg("locate");
export const getEditorIconSvg = (): string => getIconSvg("editor");
export const getGoToTopIconSvg = (): string => getIconSvg("goToTop");
