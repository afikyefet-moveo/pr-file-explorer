import { FILE_TREE_ID, TREE_SYNC_CLASS } from "../../shared/constants";
import {
  findFileTreeItem,
  scrollItemIntoExplorerView,
} from "../locate/locateFile";
import {
  getFilePathFromDiffRegion,
  normalizePath,
} from "../../shared/dom";
import { pickPrimaryVisibleDiffRegion } from "../../shared/viewportDiff";
import { getStickyHeaderOffset } from "../../shared/stickyHeader";
import { getFileTabsBarHeight } from "../fileTabs/fileTabs";

let installed = false;
let lastMarked: HTMLElement | null = null;
let scrollListener: (() => void) | null = null;
let resizeListener: (() => void) | null = null;
/** When true, highlight still tracks the diff, but we do not scroll the file tree. */
let suppressTreeAutoScroll = false;
let treeScrollCaptureListener: ((event: Event) => void) | null = null;
let treeScrollIntentListener: ((event: Event) => void) | null = null;
let lastTreeScrollIntentAt = 0;
let lastScrollIntent: "tree" | "viewport" | null = null;
let ignoreProgrammaticTreeScrollUntil = 0;

const TREE_SCROLL_INTENT_GRACE_MS = 1800;
const PROGRAMMATIC_TREE_SCROLL_IGNORE_MS = 450;
const SCROLL_KEYS = new Set([
  " ",
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  "Spacebar",
]);

function readingBandTopOffset(): number {
  return getStickyHeaderOffset() + getFileTabsBarHeight();
}

function clearTreeSyncMark(): void {
  if (lastMarked) {
    lastMarked.classList.remove(TREE_SYNC_CLASS);
    lastMarked = null;
  }
}

function treeItemNeedsScrollIntoView(item: HTMLElement): boolean {
  const scroller =
    document.querySelector<HTMLElement>(
      `#${FILE_TREE_ID} [class*='FileTreeScrollable']`
    ) ?? document.querySelector<HTMLElement>(`#${FILE_TREE_ID}`);

  if (!scroller) {
    return true;
  }

  const itemRect = item.getBoundingClientRect();
  const scrollRect = scroller.getBoundingClientRect();
  const margin = 4;
  return (
    itemRect.top < scrollRect.top + margin ||
    itemRect.bottom > scrollRect.bottom - margin
  );
}

function maybeScrollTreeToItem(item: HTMLElement): void {
  if (suppressTreeAutoScroll) {
    return;
  }
  if (treeItemNeedsScrollIntoView(item)) {
    ignoreProgrammaticTreeScrollUntil =
      now() + PROGRAMMATIC_TREE_SCROLL_IGNORE_MS;
    scrollItemIntoExplorerView(item, { behavior: "auto" });
  }
}

function onTreeScrollIntentCapture(event: Event): void {
  if (event instanceof KeyboardEvent && !isScrollKeyEvent(event)) {
    return;
  }

  if (isEventInsideFileTree(event)) {
    rememberTreeScrollIntent();
    return;
  }

  lastScrollIntent = "viewport";
}

function onDocumentScrollCapture(event: Event): void {
  if (!isEventInsideFileTree(event)) {
    return;
  }

  if (now() <= ignoreProgrammaticTreeScrollUntil) {
    return;
  }

  rememberTreeScrollIntent();
}

function onViewportScroll(): void {
  if (lastScrollIntent !== "tree" || !hasRecentTreeScrollIntent()) {
    suppressTreeAutoScroll = false;
  }

  refreshExplorerSync();
}

function rememberTreeScrollIntent(): void {
  suppressTreeAutoScroll = true;
  lastScrollIntent = "tree";
  lastTreeScrollIntentAt = now();
}

function hasRecentTreeScrollIntent(): boolean {
  return now() - lastTreeScrollIntentAt < TREE_SCROLL_INTENT_GRACE_MS;
}

function isEventInsideFileTree(event: Event): boolean {
  const target = event.target;
  if (!(target instanceof Node)) {
    return false;
  }

  const tree = document.getElementById(FILE_TREE_ID);
  return Boolean(tree?.contains(target));
}

function isScrollKeyEvent(event: KeyboardEvent): boolean {
  if (
    !SCROLL_KEYS.has(event.key) ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return true;
  }

  return (
    !target.isContentEditable &&
    target.tagName !== "INPUT" &&
    target.tagName !== "SELECT" &&
    target.tagName !== "TEXTAREA"
  );
}

function now(): number {
  return window.performance?.now() ?? Date.now();
}

export function refreshExplorerSync(): void {
  if (!installed) {
    return;
  }

  const region = pickPrimaryVisibleDiffRegion(readingBandTopOffset());
  const path = region ? getFilePathFromDiffRegion(region) : null;

  if (!path) {
    clearTreeSyncMark();
    return;
  }

  const normalized = normalizePath(path);
  const item = findFileTreeItem(normalized);
  if (!item) {
    clearTreeSyncMark();
    return;
  }

  if (lastMarked === item) {
    maybeScrollTreeToItem(item);
    return;
  }

  clearTreeSyncMark();
  lastMarked = item;
  item.classList.add(TREE_SYNC_CLASS);

  maybeScrollTreeToItem(item);
}

export function installExplorerSync(): void {
  if (installed) {
    refreshExplorerSync();
    return;
  }

  installed = true;
  suppressTreeAutoScroll = false;
  lastTreeScrollIntentAt = 0;
  lastScrollIntent = null;
  ignoreProgrammaticTreeScrollUntil = 0;
  treeScrollIntentListener = onTreeScrollIntentCapture;
  treeScrollCaptureListener = onDocumentScrollCapture;
  document.addEventListener("wheel", treeScrollIntentListener, {
    capture: true,
    passive: true,
  });
  document.addEventListener("touchmove", treeScrollIntentListener, {
    capture: true,
    passive: true,
  });
  document.addEventListener("keydown", treeScrollIntentListener, {
    capture: true,
  });
  document.addEventListener("scroll", treeScrollCaptureListener, {
    capture: true,
    passive: true,
  });

  scrollListener = onViewportScroll;
  resizeListener = () => {
    suppressTreeAutoScroll = false;
    lastScrollIntent = null;
    refreshExplorerSync();
  };
  window.addEventListener("scroll", scrollListener, { passive: true });
  window.addEventListener("resize", resizeListener);
  refreshExplorerSync();
}

export function uninstallExplorerSync(): void {
  if (!installed) {
    return;
  }

  clearTreeSyncMark();

  if (scrollListener) {
    window.removeEventListener("scroll", scrollListener);
    scrollListener = null;
  }
  if (resizeListener) {
    window.removeEventListener("resize", resizeListener);
    resizeListener = null;
  }
  if (treeScrollCaptureListener) {
    document.removeEventListener("scroll", treeScrollCaptureListener, {
      capture: true,
    });
    treeScrollCaptureListener = null;
  }
  if (treeScrollIntentListener) {
    document.removeEventListener("wheel", treeScrollIntentListener, {
      capture: true,
    });
    document.removeEventListener("touchmove", treeScrollIntentListener, {
      capture: true,
    });
    document.removeEventListener("keydown", treeScrollIntentListener, {
      capture: true,
    });
    treeScrollIntentListener = null;
  }
  suppressTreeAutoScroll = false;
  lastTreeScrollIntentAt = 0;
  lastScrollIntent = null;
  ignoreProgrammaticTreeScrollUntil = 0;

  installed = false;
}
