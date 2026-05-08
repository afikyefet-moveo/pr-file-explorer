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
  var HIGHLIGHT_CLASS = "pr-file-explorer-highlight";
  var STYLE_ID = "pr-file-explorer-enhancer-style";
  var OBSERVER_DEBOUNCE_MS = 150;
  var TOP_BUTTON_VISIBLE_OFFSET = 360;
  var STORAGE_EDITOR = "prFileExplorer.editor";
  var STORAGE_REPO_ROOT = "prFileExplorer.repoRoot";

  function init() {
    injectStyles();
    enhanceFileHeaders();
    installGoToTopButton();
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
    var stickyHeader =
      document.querySelector("[class*='StickyHeader']") ||
      document.querySelector("[class*='pagehead']") ||
      document.querySelector(".js-sticky");

    if (!stickyHeader) {
      return 0;
    }

    var rect = stickyHeader.getBoundingClientRect();
    return rect.height > 0 && rect.top <= 1 ? rect.height : 0;
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
      timeoutId = window.setTimeout(enhanceFileHeaders, OBSERVER_DEBOUNCE_MS);
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
