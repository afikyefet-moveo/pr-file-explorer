// ==UserScript==
// @name         GitHub PR File Explorer Enhancer
// @namespace    local.pr-file-explorer
// @version      0.1.0
// @description  Locate the current GitHub PR diff file in the PR file explorer.
// @match        https://github.com/*/*/pull/*/files*
// @match        https://github.com/*/*/pull/*/changes*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function githubPrFileExplorerEnhancer() {
  "use strict";

  var BUTTON_CLASS = "pr-file-explorer-locate-button";
  var EDITOR_BUTTON_CLASS = "pr-file-explorer-editor-button";
  var TOP_BUTTON_CLASS = "pr-file-explorer-top-button";
  var REVIEW_RAIL_CLASS = "pr-file-explorer-review-rail";
  var REVIEW_BUTTON_CLASS = "pr-file-explorer-review-button";
  var REVIEW_STATUS_CLASS = "pr-file-explorer-review-status";
  var COMMENT_BADGE_CLASS = "pr-file-explorer-comment-badge";
  var TOOLTIP_CLASS = "pr-file-explorer-tooltip";
  var HIGHLIGHT_CLASS = "pr-file-explorer-highlight";
  var STYLE_ID = "pr-file-explorer-enhancer-style";
  var TOOLTIP_ID = "pr-file-explorer-tooltip";
  var OBSERVER_DEBOUNCE_MS = 150;
  var TOP_BUTTON_VISIBLE_OFFSET = 360;
  var STORAGE_EDITOR = "prFileExplorer.editor";
  var STORAGE_REPO_ROOT = "prFileExplorer.repoRoot";

  function init() {
    injectStyles();
    enhanceFileHeaders();
    installGoToTopButton();
    installReviewFlowRail();
    refreshReviewFlow();
    observeGitHubUpdates();
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "." + BUTTON_CLASS + " {",
      "  align-items: center;",
      "  border-radius: 6px;",
      "  display: inline-flex;",
      "  justify-content: center;",
      "  margin-left: 4px;",
      "  min-width: 28px;",
      "}",
      "." + EDITOR_BUTTON_CLASS + " {",
      "  align-items: center;",
      "  border-radius: 6px;",
      "  display: inline-flex;",
      "  justify-content: center;",
      "  margin-left: 2px;",
      "  min-width: 28px;",
      "}",
      "." + BUTTON_CLASS + "[data-state='not-found'],",
      "." + EDITOR_BUTTON_CLASS + "[data-state='error'] {",
      "  color: var(--fgColor-danger, var(--color-danger-fg));",
      "}",
      "." + EDITOR_BUTTON_CLASS + "[data-state='copied'] {",
      "  color: var(--fgColor-success, var(--color-success-fg));",
      "}",
      "." + TOP_BUTTON_CLASS + " {",
      "  align-items: center;",
      "  bottom: max(24px, env(safe-area-inset-bottom));",
      "  box-shadow: var(--shadow-floating-small, 0 8px 24px rgba(140, 149, 159, 0.2));",
      "  display: none;",
      "  height: 32px;",
      "  justify-content: center;",
      "  position: fixed;",
      "  right: max(24px, env(safe-area-inset-right));",
      "  transition: opacity 120ms ease-out, transform 120ms ease-out;",
      "  width: 32px;",
      "  z-index: 80;",
      "}",
      "." + TOP_BUTTON_CLASS + "[data-visible='true'] {",
      "  display: inline-flex;",
      "}",
      "." + REVIEW_RAIL_CLASS + " {",
      "  align-items: center;",
      "  bottom: calc(max(24px, env(safe-area-inset-bottom)) + 40px);",
      "  display: none;",
      "  flex-direction: column;",
      "  gap: 6px;",
      "  position: fixed;",
      "  right: max(24px, env(safe-area-inset-right));",
      "  z-index: 80;",
      "}",
      "." + REVIEW_RAIL_CLASS + "[data-visible='true'] {",
      "  display: flex;",
      "}",
      "." + REVIEW_BUTTON_CLASS + " {",
      "  align-items: center;",
      "  box-shadow: var(--shadow-floating-small, 0 8px 24px rgba(140, 149, 159, 0.2));",
      "  display: inline-flex;",
      "  height: 32px;",
      "  justify-content: center;",
      "  width: 32px;",
      "}",
      "." + REVIEW_BUTTON_CLASS + "[data-state='copied'] {",
      "  color: var(--fgColor-success, var(--color-success-fg));",
      "}",
      "." + REVIEW_BUTTON_CLASS + "[data-state='error'] {",
      "  color: var(--fgColor-danger, var(--color-danger-fg));",
      "}",
      "." + REVIEW_BUTTON_CLASS + ":disabled {",
      "  cursor: default;",
      "  opacity: 0.55;",
      "}",
      "." + REVIEW_STATUS_CLASS + " {",
      "  align-items: center;",
      "  background: var(--bgColor-default, var(--color-canvas-default));",
      "  border: 1px solid var(--borderColor-default, var(--color-border-default));",
      "  border-radius: 999px;",
      "  box-shadow: var(--shadow-floating-small, 0 8px 24px rgba(140, 149, 159, 0.2));",
      "  color: var(--fgColor-muted, var(--color-fg-muted));",
      "  display: inline-flex;",
      "  font-size: 11px;",
      "  font-weight: 600;",
      "  height: 22px;",
      "  justify-content: center;",
      "  line-height: 1;",
      "  min-width: 22px;",
      "  padding: 0 7px;",
      "}",
      "." + REVIEW_STATUS_CLASS + "[data-state='comments'] {",
      "  color: var(--fgColor-accent, var(--color-accent-fg));",
      "}",
      "." + REVIEW_STATUS_CLASS + "[data-state='unresolved'] {",
      "  color: var(--fgColor-danger, var(--color-danger-fg));",
      "}",
      "." + COMMENT_BADGE_CLASS + " {",
      "  background: var(--fgColor-accent, var(--color-accent-fg));",
      "  border-radius: 999px;",
      "  display: inline-block;",
      "  flex: 0 0 auto;",
      "  height: 6px;",
      "  margin-left: 6px;",
      "  width: 6px;",
      "}",
      "." + TOOLTIP_CLASS + " {",
      "  background: var(--bgColor-emphasis, var(--color-neutral-emphasis-plus));",
      "  border-radius: 6px;",
      "  color: var(--fgColor-onEmphasis, var(--color-fg-on-emphasis));",
      "  display: none;",
      "  font-size: 12px;",
      "  line-height: 1.4;",
      "  max-width: 260px;",
      "  padding: 6px 8px;",
      "  pointer-events: none;",
      "  position: fixed;",
      "  text-align: center;",
      "  white-space: normal;",
      "  z-index: 9999;",
      "}",
      "." + TOOLTIP_CLASS + "[data-visible='true'] {",
      "  display: block;",
      "}",
      "." + HIGHLIGHT_CLASS + " > .PRIVATE_TreeView-item-container,",
      "." + HIGHLIGHT_CLASS + " .PRIVATE_TreeView-item-container,",
      "." + HIGHLIGHT_CLASS + " {",
      "  animation: pr-file-explorer-pulse 1200ms ease-out;",
      "}",
      "@keyframes pr-file-explorer-pulse {",
      "  0% { background: var(--bgColor-accent-muted, var(--color-accent-subtle)); box-shadow: inset 0 0 0 1px var(--borderColor-accent-emphasis, var(--color-accent-emphasis)); }",
      "  45% { background: var(--bgColor-accent-muted, var(--color-accent-subtle)); box-shadow: inset 0 0 0 1px var(--borderColor-accent-emphasis, var(--color-accent-emphasis)); }",
      "  100% { background: transparent; box-shadow: inset 0 0 0 1px transparent; }",
      "}",
    ].join("\n");

    document.head.appendChild(style);
  }

  function enhanceFileHeaders() {
    getCandidateHeaderNodes().forEach(function enhance(header) {
      if (header.querySelector("." + BUTTON_CLASS)) {
        return;
      }

      var filePath = getFilePathFromHeader(header);
      if (!filePath) {
        return;
      }

      var button = createLocateButton(filePath);
      var editorButton = createEditorButton(filePath, header);
      var copyButton = findCopyFileNameButton(header);
      if (copyButton && copyButton.parentNode) {
        copyButton.insertAdjacentElement("afterend", button);
        button.insertAdjacentElement("afterend", editorButton);
        return;
      }

      var pathHeading = header.querySelector("h3");
      if (pathHeading && pathHeading.parentNode) {
        pathHeading.insertAdjacentElement("afterend", button);
        button.insertAdjacentElement("afterend", editorButton);
      }
    });
  }

  function getCandidateHeaderNodes() {
    var pathButtons = Array.prototype.slice.call(
      document.querySelectorAll("[data-file-path]")
    );

    return pathButtons
      .map(function toHeader(node) {
        return (
          node.closest("[class*='DiffFileHeader-module__diff-file-header']") ||
          node.closest("[role='region']") ||
          node.parentElement
        );
      })
      .filter(Boolean)
      .filter(uniqueNode);
  }

  function uniqueNode(node, index, list) {
    return list.indexOf(node) === index;
  }

  function createLocateButton(filePath) {
    var button = document.createElement("button");
    button.type = "button";
    button.className =
      "prc-Button-ButtonBase-9n-Xk flex-shrink-0 prc-Button-IconButton-fyge7 " +
      BUTTON_CLASS;
    button.setAttribute("data-component", "IconButton");
    button.setAttribute("data-loading", "false");
    button.setAttribute("data-no-visuals", "true");
    button.setAttribute("data-size", "small");
    button.setAttribute("data-variant", "invisible");
    button.setAttribute("aria-label", "Locate file in file explorer");
    button.title = "Locate file in file explorer";
    button.dataset.filePath = filePath;
    button.innerHTML = getLocateIconSvg();
    installTooltip(button, "Locate this file in the file explorer");
    button.addEventListener("click", function onClick(event) {
      event.preventDefault();
      event.stopPropagation();
      locateFileFromButton(button);
    });
    return button;
  }

  function createEditorButton(filePath, header) {
    var button = document.createElement("button");
    button.type = "button";
    button.className =
      "prc-Button-ButtonBase-9n-Xk flex-shrink-0 prc-Button-IconButton-fyge7 " +
      EDITOR_BUTTON_CLASS;
    button.setAttribute("data-component", "IconButton");
    button.setAttribute("data-loading", "false");
    button.setAttribute("data-no-visuals", "true");
    button.setAttribute("data-size", "small");
    button.setAttribute("data-variant", "invisible");
    button.setAttribute("aria-label", "Copy editor command");
    button.title = "Copy editor command. Option-click to configure.";
    button.dataset.filePath = filePath;
    button.innerHTML = getEditorIconSvg();
    installTooltip(button, "Copy editor command. Option-click to configure.");
    button.addEventListener("click", function onClick(event) {
      event.preventDefault();
      event.stopPropagation();

      if (event.altKey) {
        configureEditorCommand(button);
        return;
      }

      copyEditorCommand(button, header);
    });
    return button;
  }

  function getLocateIconSvg() {
    return [
      '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
      ' class="octicon octicon-location" viewBox="0 0 16 16" width="16" height="16"',
      ' fill="currentColor" display="inline-block" overflow="visible"',
      ' style="vertical-align: text-bottom;">',
      '<path d="M8 1.25a6.75 6.75 0 0 0-6.75 6.75.75.75 0 0 0 1.5 0 5.25 5.25 0 1 1 5.25 5.25.75.75 0 0 0 0 1.5A6.75 6.75 0 0 0 8 1.25Z"></path>',
      '<path d="M8 4.75A3.25 3.25 0 1 0 8 11.25 3.25 3.25 0 0 0 8 4.75Zm0 1.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z"></path>',
      '<path d="M8.75.75a.75.75 0 0 0-1.5 0v2a.75.75 0 0 0 1.5 0v-2Zm0 12.5a.75.75 0 0 0-1.5 0v2a.75.75 0 0 0 1.5 0v-2ZM.75 7.25a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Zm12.5 0a.75.75 0 0 0 0 1.5h2a.75.75 0 0 0 0-1.5h-2Z"></path>',
      "</svg>",
    ].join("");
  }

  function getEditorIconSvg() {
    return [
      '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
      ' class="octicon octicon-terminal" viewBox="0 0 16 16" width="16" height="16"',
      ' fill="currentColor" display="inline-block" overflow="visible"',
      ' style="vertical-align: text-bottom;">',
      '<path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25Z"></path>',
      '<path d="M3.72 4.72a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-2 2a.749.749 0 1 1-1.06-1.06L5.19 7.25 3.72 5.78a.75.75 0 0 1 0-1.06ZM8.75 9.5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5Z"></path>',
      "</svg>",
    ].join("");
  }

  function locateFileFromButton(button) {
    var filePath = normalizePath(button.dataset.filePath);
    var match = findFileTreeItem(filePath);

    if (!match) {
      flashButtonNotFound(button);
      return;
    }

    scrollItemIntoExplorerView(match);
    highlightTreeItem(match);
    button.dataset.state = "";
  }

  function getFilePathFromHeader(header) {
    var explicitPathNode = header.querySelector("[data-file-path]");
    if (explicitPathNode && explicitPathNode.dataset.filePath) {
      return normalizePath(explicitPathNode.dataset.filePath);
    }

    var code = header.querySelector("h3 code");
    if (code) {
      return normalizePath(code.textContent);
    }

    return "";
  }

  function normalizePath(value) {
    return String(value || "")
      .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findCopyFileNameButton(header) {
    var tooltips = Array.prototype.slice.call(
      header.querySelectorAll("[id][aria-label], [id]")
    );

    var tooltip = tooltips.find(function isCopyTooltip(node) {
      var label = normalizePath(node.getAttribute("aria-label") || node.textContent);
      return label === "Copy file name to clipboard";
    });

    if (!tooltip) {
      return null;
    }

    return header.querySelector("[aria-labelledby='" + cssEscape(tooltip.id) + "']");
  }

  function findFileTreeItem(filePath) {
    var tree = document.querySelector("#pr-file-tree");
    if (!tree || !filePath) {
      return null;
    }

    var items = Array.prototype.slice.call(tree.querySelectorAll("[role='treeitem']"));
    return (
      items.find(function matchesId(item) {
        return normalizePath(item.id) === filePath;
      }) ||
      items.find(function matchesLabel(item) {
        return normalizePath(item.getAttribute("aria-label")) === basename(filePath);
      }) ||
      items.find(function matchesVisibleText(item) {
        return normalizePath(item.textContent).endsWith(basename(filePath));
      }) ||
      null
    );
  }

  function installGoToTopButton() {
    if (document.querySelector("." + TOP_BUTTON_CLASS)) {
      return;
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className =
      "prc-Button-ButtonBase-9n-Xk prc-Button-IconButton-fyge7 " + TOP_BUTTON_CLASS;
    button.setAttribute("data-component", "IconButton");
    button.setAttribute("data-loading", "false");
    button.setAttribute("data-size", "small");
    button.setAttribute("data-variant", "default");
    button.setAttribute("aria-label", "Back to top of files");
    button.title = "Back to top of files. Shift-click for page top.";
    button.innerHTML = getGoToTopIconSvg();
    installTooltip(button, "Back to top of files. Shift-click for page top.");
    button.addEventListener("click", function onClick(event) {
      scrollBackToTop(event.shiftKey);
    });

    document.body.appendChild(button);
    updateGoToTopVisibility(button);
    window.addEventListener(
      "scroll",
      function onScroll() {
        updateGoToTopVisibility(button);
      },
      { passive: true }
    );
  }

  function updateGoToTopVisibility(button) {
    button.dataset.visible = shouldShowGoToTopButton() ? "true" : "false";
  }

  function shouldShowGoToTopButton() {
    var targetTop = getFilesTopScrollY();
    return window.scrollY > targetTop + TOP_BUTTON_VISIBLE_OFFSET;
  }

  function scrollBackToTop(usePageTop) {
    window.scrollTo({
      top: usePageTop ? 0 : getFilesTopScrollY(),
      behavior: "smooth",
    });
  }

  function getFilesTopScrollY() {
    var target =
      document.querySelector("[data-testid='diff-content']") ||
      document.querySelector("[data-testid='progressive-diffs-list']") ||
      document.querySelector("#files") ||
      document.body;

    var stickyOffset = getStickyHeaderOffset();
    var targetTop = target.getBoundingClientRect().top + window.scrollY - stickyOffset - 8;
    return Math.max(0, targetTop);
  }

  function getStickyHeaderOffset() {
    var selector = [
      "[class*='use-sticky-header-module__stickyHeader']",
      "[class*='PullRequestFilesToolbar-module__toolbar']",
      "[class*='StickyHeader']",
      "[class*='pagehead']",
      ".js-sticky",
    ].join(",");
    var candidates = Array.prototype.slice.call(
      document.querySelectorAll(selector)
    );
    if (!candidates.length) {
      return 0;
    }
    var tolerance = 2;
    var maxIterations = 10;
    var offset = 0;
    for (var i = 0; i < maxIterations; i++) {
      var next = offset;
      for (var j = 0; j < candidates.length; j++) {
        var rect = candidates[j].getBoundingClientRect();
        if (rect.height <= 0 || rect.width <= 0) {
          continue;
        }
        if (rect.top <= offset + tolerance && rect.bottom > offset) {
          next = Math.max(next, rect.bottom);
        }
      }
      if (next <= offset + 0.5) {
        break;
      }
      offset = next;
    }
    return offset;
  }

  function getGoToTopIconSvg() {
    return [
      '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
      ' class="octicon octicon-arrow-up" viewBox="0 0 16 16" width="16" height="16"',
      ' fill="currentColor" display="inline-block" overflow="visible"',
      ' style="vertical-align: text-bottom;">',
      '<path d="M3.47 7.78a.75.75 0 0 0 1.06 0L7.25 5.06v8.19a.75.75 0 0 0 1.5 0V5.06l2.72 2.72a.749.749 0 1 0 1.06-1.06L8.53 2.72a.749.749 0 0 0-1.06 0L3.47 6.72a.75.75 0 0 0 0 1.06Z"></path>',
      "</svg>",
    ].join("");
  }

  function installTooltip(element, text) {
    element.dataset.prFileExplorerTooltip = text;
    element.setAttribute("aria-describedby", TOOLTIP_ID);
    element.addEventListener("mouseenter", showTooltipForElement);
    element.addEventListener("focus", showTooltipForElement);
    element.addEventListener("mouseleave", hideTooltip);
    element.addEventListener("blur", hideTooltip);
    element.addEventListener("mousedown", hideTooltip);
  }

  function showTooltipForElement(event) {
    var element = event.currentTarget;
    var text = element.dataset.prFileExplorerTooltip;
    if (!text) {
      return;
    }

    var tooltip = getTooltipElement();
    tooltip.textContent = text;
    tooltip.dataset.visible = "true";
    positionTooltip(tooltip, element);
  }

  function hideTooltip() {
    var tooltip = document.getElementById(TOOLTIP_ID);
    if (tooltip) {
      tooltip.dataset.visible = "false";
    }
  }

  function getTooltipElement() {
    var tooltip = document.getElementById(TOOLTIP_ID);
    if (tooltip) {
      return tooltip;
    }

    tooltip = document.createElement("div");
    tooltip.id = TOOLTIP_ID;
    tooltip.className = TOOLTIP_CLASS;
    tooltip.setAttribute("role", "tooltip");
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function positionTooltip(tooltip, target) {
    var targetRect = target.getBoundingClientRect();
    var tooltipRect = tooltip.getBoundingClientRect();
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    var gap = 8;
    var top = targetRect.top - tooltipRect.height - gap;

    if (top < gap) {
      top = targetRect.bottom + gap;
    }

    var left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(gap, Math.min(left, viewportWidth - tooltipRect.width - gap));

    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function installReviewFlowRail() {
    if (document.querySelector("." + REVIEW_RAIL_CLASS)) {
      return;
    }

    var rail = document.createElement("div");
    rail.className = REVIEW_RAIL_CLASS;
    rail.dataset.visible = "false";

    var status = document.createElement("span");
    status.className = REVIEW_STATUS_CLASS;
    status.textContent = "0";
    status.dataset.state = "none";
    installTooltip(status, "No comments in current file");

    rail.appendChild(status);
    rail.appendChild(
      createReviewRailButton("next-comment", "Next comment", getCommentIconSvg(), jumpToNextComment)
    );
    rail.appendChild(
      createReviewRailButton(
        "next-unviewed",
        "Next unviewed file",
        getUnviewedIconSvg(),
        jumpToNextUnviewedFile
      )
    );
    rail.appendChild(
      createReviewRailButton(
        "copy-context",
        "Copy review context",
        getCopyContextIconSvg(),
        copyReviewContext
      )
    );
    document.body.appendChild(rail);

    window.addEventListener(
      "scroll",
      function onScroll() {
        refreshReviewFlow();
      },
      { passive: true }
    );
  }

  function createReviewRailButton(action, label, iconSvg, handler) {
    var button = document.createElement("button");
    button.type = "button";
    button.className =
      "prc-Button-ButtonBase-9n-Xk prc-Button-IconButton-fyge7 " + REVIEW_BUTTON_CLASS;
    button.setAttribute("data-component", "IconButton");
    button.setAttribute("data-loading", "false");
    button.setAttribute("data-size", "small");
    button.setAttribute("data-variant", "default");
    button.setAttribute("aria-label", label);
    button.dataset.reviewAction = action;
    button.title = label;
    button.innerHTML = iconSvg;
    installTooltip(button, label);
    button.addEventListener("click", function onClick(event) {
      event.preventDefault();
      event.stopPropagation();
      handler(button);
    });
    return button;
  }

  function refreshReviewFlow() {
    var rail = document.querySelector("." + REVIEW_RAIL_CLASS);
    if (rail) {
      rail.dataset.visible = getDiffRegions().length ? "true" : "false";
      updateReviewRailButtons(rail);
    }

    markFilesWithComments();
  }

  function updateReviewRailButtons(rail) {
    var currentRegion = getCurrentDiffRegion();
    var status = rail.querySelector("." + REVIEW_STATUS_CLASS);
    var nextCommentButton = rail.querySelector("[data-review-action='next-comment']");
    var nextUnviewedButton = rail.querySelector("[data-review-action='next-unviewed']");
    var copyContextButton = rail.querySelector("[data-review-action='copy-context']");

    setReviewButtonState(
      nextCommentButton,
      getCommentTargets().length > 0,
      getCommentTargets().length ? "Next comment" : "No comments"
    );
    setReviewButtonState(
      nextUnviewedButton,
      getUnviewedRegions().length > 0,
      getUnviewedRegions().length ? "Next unviewed file" : "No unviewed files"
    );
    setReviewButtonState(
      copyContextButton,
      Boolean(currentRegion),
      currentRegion ? "Copy review context" : "No current file"
    );
    updateCurrentFileCommentStatus(status, currentRegion);
  }

  function setReviewButtonState(button, enabled, tooltip) {
    if (!button) {
      return;
    }

    button.disabled = !enabled;
    button.title = tooltip;
    button.dataset.prFileExplorerTooltip = tooltip;
  }

  function updateCurrentFileCommentStatus(status, region) {
    if (!status) {
      return;
    }

    if (!region) {
      status.textContent = "0";
      status.dataset.state = "none";
      status.dataset.prFileExplorerTooltip = "No current file";
      return;
    }

    if (hasUnresolvedThread(region)) {
      status.textContent = "!";
      status.dataset.state = "unresolved";
      status.dataset.prFileExplorerTooltip = "Current file has unresolved review threads";
      return;
    }

    if (getCommentTargetsForRegion(region).length) {
      status.textContent = "C";
      status.dataset.state = "comments";
      status.dataset.prFileExplorerTooltip = "Current file has review comments";
      return;
    }

    status.textContent = "0";
    status.dataset.state = "none";
    status.dataset.prFileExplorerTooltip = "No comments in current file";
  }

  function getDiffRegions() {
    return Array.prototype.slice
      .call(document.querySelectorAll("[role='region'][id^='diff-']"))
      .filter(function hasPath(region) {
        return Boolean(getFilePathFromRegion(region));
      });
  }

  function getCurrentDiffRegion() {
    var viewportTop = getStickyHeaderOffset();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var viewportMiddle = viewportTop + (viewportHeight - viewportTop) / 2;
    var regions = getDiffRegions();

    return (
      regions.find(function containsMiddle(region) {
        var rect = region.getBoundingClientRect();
        return rect.top <= viewportMiddle && rect.bottom >= viewportMiddle;
      }) ||
      regions.find(function isVisible(region) {
        var rect = region.getBoundingClientRect();
        return rect.bottom > viewportTop && rect.top < viewportHeight;
      }) ||
      null
    );
  }

  function getFilePathFromRegion(region) {
    return getFilePathFromHeader(region);
  }

  function getCommentTargets() {
    var targets = getAllCommentTargets();
    var unresolved = targets.filter(function isUnresolved(target) {
      return isUnresolvedThread(target.element);
    });
    return unresolved.length ? unresolved : targets;
  }

  function getAllCommentTargets() {
    var threadNodes = Array.prototype.slice.call(
      document.querySelectorAll("[data-testid='review-thread'], [data-marker-navigation-comment-thread-id]")
    );
    return threadNodes
      .map(function toTarget(node) {
        var target =
          node.closest("[data-testid='review-thread']") ||
          node.closest("[data-marker-navigation-comment-thread-id]") ||
          node;
        var region = target.closest("[role='region'][id^='diff-']");
        return region ? { element: target, region: region } : null;
      })
      .filter(Boolean)
      .filter(function uniqueTarget(target, index, list) {
        return (
          list.findIndex(function sameElement(other) {
            return other.element === target.element;
          }) === index
        );
      });
  }

  function getCommentTargetsForRegion(region) {
    return getAllCommentTargets().filter(function isSameRegion(target) {
      return target.region === region;
    });
  }

  function hasUnresolvedThread(region) {
    return getCommentTargetsForRegion(region).some(function targetHasUnresolved(target) {
      return isUnresolvedThread(target.element);
    });
  }

  function isUnresolvedThread(thread) {
    var buttons = Array.prototype.slice.call(thread.querySelectorAll("button, [role='button']"));
    return buttons.some(function buttonLooksLikeResolve(button) {
      var label = normalizePath(
        button.getAttribute("aria-label") || button.textContent || button.getAttribute("title")
      ).toLowerCase();
      return label.indexOf("resolve") !== -1 && label.indexOf("unresolve") === -1;
    });
  }

  function jumpToNextComment(button) {
    var targets = getCommentTargets();
    if (!targets.length) {
      return;
    }

    var elements = targets.map(function toElement(target) {
      return target.element;
    });
    var next = findNextElementByViewport(elements) || elements[0];
    scrollToElement(next);
    flashReviewButton(button, "copied", "Jumped to next comment");
  }

  function jumpToNextUnviewedFile(button) {
    var regions = getUnviewedRegions();
    if (!regions.length) {
      return;
    }

    scrollToElement(findNextElementByViewport(regions) || regions[0]);
    flashReviewButton(button, "copied", "Jumped to next unviewed file");
  }

  function getUnviewedRegions() {
    return getDiffRegions().filter(function isUnviewed(region) {
      return Boolean(
        region.querySelector("button[aria-label='Not Viewed']") ||
          Array.prototype.slice.call(region.querySelectorAll("button[aria-pressed='false']")).find(
            function hasViewedText(button) {
              return normalizePath(button.textContent).indexOf("Viewed") !== -1;
            }
          )
      );
    });
  }

  function findNextElementByViewport(elements) {
    var viewportTop = getStickyHeaderOffset();
    var afterCurrent = elements
      .map(function withTop(element) {
        return {
          element: element,
          top: element.getBoundingClientRect().top,
        };
      })
      .filter(function isAfterCurrent(entry) {
        return entry.top > viewportTop + 24;
      })
      .sort(function sortByTop(a, b) {
        return a.top - b.top;
      });

    return afterCurrent.length ? afterCurrent[0].element : null;
  }

  function scrollToElement(element) {
    var targetTop = element.getBoundingClientRect().top + window.scrollY - getStickyHeaderOffset() - 12;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }

  function copyReviewContext(button) {
    var region = getCurrentDiffRegion();
    if (!region) {
      flashReviewButton(button, "error", "No current file");
      return;
    }

    copyText(buildReviewContextMarkdown(getReviewContext(region)))
      .then(function onCopied() {
        flashReviewButton(button, "copied", "Copied review context");
      })
      .catch(function onError() {
        flashReviewButton(button, "error", "Could not copy review context");
      });
  }

  function getReviewContext(region) {
    var selectedLines = getSelectedRightSideLines(region);
    var visibleLine = getFirstVisibleRightSideLine(region);
    var lineNumbers = selectedLines.length ? selectedLines : visibleLine ? [visibleLine] : [];

    return {
      filePath: getFilePathFromRegion(region),
      lineLabel: formatLineLabel(lineNumbers),
      selectedText: normalizeSelectedText(window.getSelection ? window.getSelection().toString() : ""),
      url: buildReviewContextUrl(region, lineNumbers[0]),
    };
  }

  function getSelectedRightSideLines(region) {
    return Array.prototype.slice
      .call(region.querySelectorAll("[data-line-number][data-diff-side='right'][data-selected='true']"))
      .map(function toLineNumber(cell) {
        return normalizePath(cell.getAttribute("data-line-number"));
      })
      .filter(Boolean)
      .filter(function uniqueLine(line, index, list) {
        return list.indexOf(line) === index;
      })
      .sort(function sortNumeric(a, b) {
        return Number(a) - Number(b);
      });
  }

  function getFirstVisibleRightSideLine(region) {
    var cells = Array.prototype.slice.call(
      region.querySelectorAll("[data-line-number][data-diff-side='right']")
    );
    var viewportTop = getStickyHeaderOffset();
    var viewportBottom = window.innerHeight || document.documentElement.clientHeight;
    var visible = cells.find(function isVisible(cell) {
      var rect = cell.getBoundingClientRect();
      return rect.bottom > viewportTop && rect.top < viewportBottom;
    });

    return visible ? normalizePath(visible.getAttribute("data-line-number")) : "";
  }

  function formatLineLabel(lines) {
    if (!lines.length) {
      return "";
    }

    if (lines.length === 1) {
      return "R" + lines[0];
    }

    return "R" + lines[0] + "-R" + lines[lines.length - 1];
  }

  function buildReviewContextUrl(region, lineNumber) {
    var url = new URL(window.location.href);
    url.hash = lineNumber ? region.id + "R" + lineNumber : region.id;
    return url.toString();
  }

  function buildReviewContextMarkdown(context) {
    var lines = ["### Review context", "", "File: `" + context.filePath + "`"];

    if (context.lineLabel) {
      lines.push("Line: " + context.lineLabel);
    }

    lines.push("PR: " + context.url);

    if (context.selectedText) {
      lines.push("", "Selected text:", "", "```", context.selectedText, "```");
    }

    return lines.join("\n");
  }

  function normalizeSelectedText(text) {
    return String(text || "").trim();
  }

  function markFilesWithComments() {
    var commentedPaths = getCommentedFilePaths();
    Array.prototype.slice.call(document.querySelectorAll("." + COMMENT_BADGE_CLASS)).forEach(
      function removeStaleBadge(badge) {
        if (commentedPaths.indexOf(badge.dataset.filePath) === -1) {
          badge.remove();
        }
      }
    );

    commentedPaths.forEach(function markPath(filePath) {
      var treeItem = findFileTreeItem(filePath);
      if (!treeItem || treeItem.querySelector("." + COMMENT_BADGE_CLASS)) {
        return;
      }

      var textContainer = treeItem.querySelector("[class*='TreeViewItemContentText']") || treeItem;
      var badge = document.createElement("span");
      badge.className = COMMENT_BADGE_CLASS;
      badge.dataset.filePath = filePath;
      badge.setAttribute("aria-label", "Has review comments");
      badge.title = "Has review comments";
      installTooltip(badge, "Has review comments");
      textContainer.appendChild(badge);
    });
  }

  function getCommentedFilePaths() {
    return getAllCommentTargets()
      .map(function toPath(target) {
        return getFilePathFromRegion(target.region);
      })
      .filter(Boolean)
      .filter(function uniquePath(path, index, list) {
        return list.indexOf(path) === index;
      });
  }

  function flashReviewButton(button, state, title) {
    if (!button) {
      return;
    }

    button.dataset.state = state;
    button.title = title;
    button.dataset.prFileExplorerTooltip = title;
    window.setTimeout(function resetButton() {
      button.dataset.state = "";
      refreshReviewFlow();
    }, 1400);
  }

  function getCommentIconSvg() {
    return [
      '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
      ' class="octicon octicon-comment-discussion" viewBox="0 0 16 16" width="16" height="16"',
      ' fill="currentColor" display="inline-block" overflow="visible"',
      ' style="vertical-align: text-bottom;">',
      '<path d="M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.458 1.458 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1Zm0 1.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25Z"></path>',
      '<path d="M14.25 4h-.75v1.5h.75c.138 0 .25.112.25.25v5.5a.25.25 0 0 1-.25.25h-1a.75.75 0 0 0-.75.75v1.19l-1.72-1.72a.749.749 0 0 0-.53-.22H6.5v1.5h3.439l1.574 1.573A1.458 1.458 0 0 0 14 13.543V13h.25A1.75 1.75 0 0 0 16 11.25v-5.5A1.75 1.75 0 0 0 14.25 4Z"></path>',
      "</svg>",
    ].join("");
  }

  function getUnviewedIconSvg() {
    return [
      '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
      ' class="octicon octicon-eye" viewBox="0 0 16 16" width="16" height="16"',
      ' fill="currentColor" display="inline-block" overflow="visible"',
      ' style="vertical-align: text-bottom;">',
      '<path d="M8 2c2.878 0 5.378 1.621 6.635 4.001a.75.75 0 0 1 0 .698C13.378 9.079 10.878 10.7 8 10.7S2.622 9.079 1.365 6.699a.75.75 0 0 1 0-.698C2.622 3.621 5.122 2 8 2Zm0 1.5c-2.105 0-4.026 1.092-5.092 2.85C3.974 8.108 5.895 9.2 8 9.2s4.026-1.092 5.092-2.85C12.026 4.592 10.105 3.5 8 3.5Z"></path>',
      '<path d="M8 4.5a1.85 1.85 0 1 1 0 3.7 1.85 1.85 0 0 1 0-3.7Z"></path>',
      "</svg>",
    ].join("");
  }

  function getCopyContextIconSvg() {
    return [
      '<svg data-component="Octicon" aria-hidden="true" focusable="false"',
      ' class="octicon octicon-copy" viewBox="0 0 16 16" width="16" height="16"',
      ' fill="currentColor" display="inline-block" overflow="visible"',
      ' style="vertical-align: text-bottom;">',
      '<path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>',
      '<path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>',
      "</svg>",
    ].join("");
  }

  function copyEditorCommand(button, header) {
    var config = getEditorCommandConfig();
    if (!config.repoRoot) {
      config = configureEditorCommand(button);
      if (!config.repoRoot) {
        flashEditorButton(button, "error", "Editor command needs a local repository root");
        return;
      }
    }

    var filePath = normalizePath(button.dataset.filePath);
    var lineNumber = getBestVisibleLineNumber(header);
    var command = buildEditorCommand(config.editor, config.repoRoot, filePath, lineNumber);

    copyText(command)
      .then(function onCopied() {
        flashEditorButton(button, "copied", "Copied: " + command);
      })
      .catch(function onError() {
        flashEditorButton(button, "error", "Could not copy editor command");
      });
  }

  function configureEditorCommand(button) {
    var current = getEditorCommandConfig();
    var editor = window.prompt("Editor command: cursor or code", current.editor);
    if (editor === null) {
      return current;
    }

    editor = normalizeEditor(editor);
    var repoRoot = window.prompt(
      "Local repository root",
      current.repoRoot || guessLocalRepoRoot()
    );
    if (repoRoot === null) {
      return current;
    }

    repoRoot = normalizeRepoRoot(repoRoot);
    window.localStorage.setItem(STORAGE_EDITOR, editor);
    window.localStorage.setItem(STORAGE_REPO_ROOT, repoRoot);
    flashEditorButton(button, "copied", "Editor command settings saved");

    return {
      editor: editor,
      repoRoot: repoRoot,
    };
  }

  function getEditorCommandConfig() {
    return {
      editor: normalizeEditor(window.localStorage.getItem(STORAGE_EDITOR) || "cursor"),
      repoRoot: normalizeRepoRoot(window.localStorage.getItem(STORAGE_REPO_ROOT) || ""),
    };
  }

  function normalizeEditor(editor) {
    return String(editor || "").trim().toLowerCase() === "code" ? "code" : "cursor";
  }

  function normalizeRepoRoot(repoRoot) {
    return String(repoRoot || "").trim().replace(/\/+$/, "");
  }

  function guessLocalRepoRoot() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    var repo = parts[1] || "repo";
    return "~/Projects/" + repo;
  }

  function buildEditorCommand(editor, repoRoot, filePath, lineNumber) {
    var target = repoRoot + "/" + filePath;
    if (lineNumber) {
      target += ":" + lineNumber;
    }

    return editor + " -g " + shellQuote(target);
  }

  function shellQuote(value) {
    return '"' + String(value).replace(/(["\\$`])/g, "\\$1") + '"';
  }

  function getBestVisibleLineNumber(header) {
    var region = header.closest("[role='region']");
    if (!region) {
      return "";
    }

    var cells = Array.prototype.slice.call(
      region.querySelectorAll("[data-line-number][data-diff-side='right']")
    );
    var viewportTop = 0;
    var viewportBottom = window.innerHeight || document.documentElement.clientHeight;

    var visible = cells.find(function isVisible(cell) {
      var rect = cell.getBoundingClientRect();
      return rect.bottom > viewportTop && rect.top < viewportBottom;
    });

    return visible ? normalizePath(visible.getAttribute("data-line-number")) : "";
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    } finally {
      textarea.remove();
    }
  }

  function flashEditorButton(button, state, title) {
    button.dataset.state = state;
    button.title = title;
    window.setTimeout(function resetButton() {
      button.dataset.state = "";
      button.title = "Copy editor command. Option-click to configure.";
    }, 1600);
  }

  function basename(filePath) {
    return filePath.split("/").pop();
  }

  function scrollItemIntoExplorerView(item) {
    var scroller = getFileTreeScroller();
    if (!scroller) {
      item.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      return;
    }

    var itemRect = item.getBoundingClientRect();
    var scrollerRect = scroller.getBoundingClientRect();
    var currentTop = scroller.scrollTop;
    var itemTopInsideScroller = itemRect.top - scrollerRect.top + currentTop;
    var targetTop = itemTopInsideScroller - scroller.clientHeight / 2 + itemRect.height / 2;
    var maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    var nextTop = Math.min(Math.max(0, targetTop), maxTop);

    scroller.scrollTo({
      top: nextTop,
      behavior: "smooth",
    });
  }

  function getFileTreeScroller() {
    return (
      document.querySelector("#pr-file-tree [class*='FileTreeScrollable']") ||
      document.querySelector("#pr-file-tree")
    );
  }

  function highlightTreeItem(item) {
    item.classList.remove(HIGHLIGHT_CLASS);
    // Force animation restart when the same item is clicked repeatedly.
    void item.offsetWidth;
    item.classList.add(HIGHLIGHT_CLASS);

    window.setTimeout(function removeHighlight() {
      item.classList.remove(HIGHLIGHT_CLASS);
    }, 1300);
  }

  function flashButtonNotFound(button) {
    button.dataset.state = "not-found";
    button.title = "File was not found in the visible file explorer";
    window.setTimeout(function resetButton() {
      button.dataset.state = "";
      button.title = "Locate file in file explorer";
    }, 1400);
  }

  function observeGitHubUpdates() {
    var timeoutId = 0;
    var observer = new MutationObserver(function onMutation() {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(function refreshEnhancements() {
        enhanceFileHeaders();
        refreshReviewFlow();
      }, OBSERVER_DEBOUNCE_MS);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }

    return String(value).replace(/["\\]/g, "\\$&");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
