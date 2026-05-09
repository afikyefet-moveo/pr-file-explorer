import { createIconButton } from "../../shared/buttonFactory";
import {
  FILE_TAB_CLASS,
  FILE_TAB_PIN_BUTTON_CLASS,
  FILE_TABS_BAR_CLASS,
} from "../../shared/constants";
import {
  basename,
  getDiffRegions,
  getFilePathFromDiffRegion,
  type FilePath,
} from "../../shared/dom";
import { getCloseIconSvg, getPinIconSvg } from "../../shared/icons";
import { getStickyHeaderOffset } from "../../shared/stickyHeader";
import { installTooltip, updateTooltipText } from "../../shared/tooltip";

interface OpenFile {
  path: FilePath;
  diffId: string;
  pinned: boolean;
}

const ORIGINAL_STICKY_OFFSET_KEY = "prFileExplorerOriginalStickyOffset";
const APPLIED_STICKY_OFFSET_KEY = "prFileExplorerAppliedStickyOffset";
const HEADER_STICKY_OFFSET_PROPERTY = "--header-sticky-offset";
const TABS_STICKY_TOP_PROPERTY = "--pr-file-explorer-sticky-top";
const FILE_HEADER_GAP_PX = 4;

const openFiles: OpenFile[] = [];
let installed = false;
let scrollListener: (() => void) | null = null;
let resizeListener: (() => void) | null = null;

export function installFileTabs(): void {
  if (installed) {
    return;
  }

  ensureBarMounted();
  scrollListener = () => onViewportChange();
  resizeListener = () => onViewportChange();
  window.addEventListener("scroll", scrollListener, { passive: true });
  window.addEventListener("resize", resizeListener);
  installed = true;
  refreshFileTabs();
}

export function refreshFileTabs(): void {
  if (!installed) {
    return;
  }

  const bar = ensureBarMounted();
  enhanceFileHeadersForTabs();
  syncOpenFilesWithDom();
  renderTabs(bar);
  updatePinButtons();
  syncStickyLayout(bar);
  updateActiveTabState();
}

export function uninstallFileTabs(): void {
  document.querySelector<HTMLElement>(`.${FILE_TABS_BAR_CLASS}`)?.remove();
  document
    .querySelectorAll<HTMLElement>(`.${FILE_TAB_PIN_BUTTON_CLASS}`)
    .forEach((button) => button.remove());

  if (scrollListener) {
    window.removeEventListener("scroll", scrollListener);
    scrollListener = null;
  }
  if (resizeListener) {
    window.removeEventListener("resize", resizeListener);
    resizeListener = null;
  }

  resetFileHeaderOffsets();
  openFiles.splice(0, openFiles.length);
  installed = false;
}

interface TabsMountTarget {
  parent: HTMLElement;
  before: ChildNode | null;
}

function getTabsMountTarget(): TabsMountTarget | null {
  const diffContent = document.querySelector<HTMLElement>(
    "[data-testid='diff-content']"
  );
  const diffList = document.querySelector<HTMLElement>(
    "[data-testid='progressive-diffs-list']"
  );

  if (diffContent) {
    return {
      parent: diffContent,
      before: diffList?.parentElement === diffContent ? diffList : null,
    };
  }

  if (diffList?.parentElement) {
    return {
      parent: diffList.parentElement,
      before: diffList,
    };
  }

  return null;
}

function ensureBarMounted(): HTMLElement {
  let bar = document.querySelector<HTMLElement>(`.${FILE_TABS_BAR_CLASS}`);
  if (!bar) {
    bar = createTabsBar();
  }

  const mount = getTabsMountTarget();
  if (!mount) {
    if (!bar.isConnected) {
      document.body.appendChild(bar);
    }
    return bar;
  }

  if (bar.parentElement !== mount.parent) {
    mount.parent.insertBefore(bar, mount.before);
  } else if (
    mount.before &&
    mount.before !== bar &&
    bar.nextSibling !== mount.before
  ) {
    mount.parent.insertBefore(bar, mount.before);
  }

  return bar;
}

function createTabsBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.className = FILE_TABS_BAR_CLASS;
  bar.dataset["visible"] = "false";
  bar.addEventListener("click", onTabsBarClick);
  bar.addEventListener("dblclick", onTabsBarDoubleClick);
  return bar;
}

function enhanceFileHeadersForTabs(): void {
  for (const region of getDiffRegions()) {
    const path = getFilePathFromDiffRegion(region);
    if (!path) {
      continue;
    }

    bindHeaderPreviewActions(region, path);

    if (!region.querySelector(`.${FILE_TAB_PIN_BUTTON_CLASS}`)) {
      const button = createPinButton(path, region.id);
      const insertAfter =
        region.querySelector<HTMLElement>(".pr-file-explorer-editor-button") ??
        region.querySelector<HTMLElement>(".pr-file-explorer-locate-button") ??
        region.querySelector<HTMLElement>("h3");
      insertAfter?.insertAdjacentElement("afterend", button);
    }
  }
}

function bindHeaderPreviewActions(region: HTMLElement, path: FilePath): void {
  const header =
    region.querySelector<HTMLElement>("[class*='DiffFileHeader']") ??
    region.querySelector<HTMLElement>("[class*='diff-file-header']") ??
    region.querySelector<HTMLElement>("h3")?.parentElement ??
    region.querySelector<HTMLElement>("h3");

  if (!header || header.dataset["prFileExplorerTabsBound"] === "true") {
    return;
  }

  header.dataset["prFileExplorerTabsBound"] = "true";
  header.addEventListener("click", (event) => {
    if (shouldIgnoreHeaderTabEvent(event)) {
      return;
    }
    openPreviewFile(path, region.id);
  });
  header.addEventListener("dblclick", (event) => {
    if (shouldIgnoreHeaderTabEvent(event)) {
      return;
    }
    pinFile(path, region.id);
  });
}

function shouldIgnoreHeaderTabEvent(event: Event): boolean {
  const target = event.target as HTMLElement | null;
  const interactive = target?.closest<HTMLElement>(
    "button, input, textarea, select, summary, [role='button'], [contenteditable='true']"
  );
  if (interactive) {
    return true;
  }

  const link = target?.closest<HTMLAnchorElement>("a[href]");
  return Boolean(link && !link.hash.startsWith("#diff-"));
}

function createPinButton(path: FilePath, diffId: string): HTMLButtonElement {
  const button = createIconButton({
    ariaLabel: "Pin file tab",
    title: "Pin file tab",
    extraClassName: FILE_TAB_PIN_BUTTON_CLASS,
    innerHtml: getPinIconSvg(),
    dataset: {
      filePath: path,
      diffId,
    },
  });
  installTooltip(button, "Pin file tab");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePinnedFile(path, diffId);
  });
  return button;
}

function togglePinnedFile(path: FilePath, diffId: string): void {
  const existingIndex = openFiles.findIndex((file) => file.path === path);
  if (existingIndex >= 0 && openFiles[existingIndex]?.pinned) {
    openFiles.splice(existingIndex, 1);
  } else {
    pinFile(path, diffId);
    return;
  }

  refreshFileTabs();
}

function openPreviewFile(path: FilePath, diffId: string): void {
  const existing = openFiles.find((file) => file.path === path);
  if (existing) {
    existing.diffId = diffId;
    refreshFileTabs();
    return;
  }

  const previewIndex = openFiles.findIndex((file) => !file.pinned);
  if (previewIndex >= 0) {
    openFiles.splice(previewIndex, 1);
  }
  openFiles.push({ path, diffId, pinned: false });
  refreshFileTabs();
}

function pinFile(path: FilePath, diffId: string): void {
  const existing = openFiles.find((file) => file.path === path);
  if (existing) {
    existing.diffId = diffId;
    existing.pinned = true;
  } else {
    openFiles.push({ path, diffId, pinned: true });
  }
  refreshFileTabs();
}

function syncOpenFilesWithDom(): void {
  for (const openFile of openFiles) {
    if (!document.getElementById(openFile.diffId)) {
      const region = getDiffRegions().find(
        (candidate) => getFilePathFromDiffRegion(candidate) === openFile.path
      );
      if (region) {
        openFile.diffId = region.id;
      }
    }
  }
}

function renderTabs(bar: HTMLElement): void {
  bar.replaceChildren(...openFiles.map(createTab));
}

function createTab(file: OpenFile): HTMLElement {
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = FILE_TAB_CLASS;
  tab.dataset["filePath"] = file.path;
  tab.dataset["diffId"] = file.diffId;
  tab.dataset["pinned"] = file.pinned ? "true" : "false";
  tab.dataset["preview"] = file.pinned ? "false" : "true";
  tab.dataset["active"] = isActiveFile(file) ? "true" : "false";
  tab.title = file.pinned ? file.path : `${file.path} (preview)`;
  tab.innerHTML = [
    '<span class="pr-file-explorer-tab-label"></span>',
    '<span class="pr-file-explorer-tab-close" aria-hidden="true"></span>',
  ].join("");

  const label = tab.querySelector<HTMLElement>(".pr-file-explorer-tab-label");
  const close = tab.querySelector<HTMLElement>(".pr-file-explorer-tab-close");
  if (label) {
    label.textContent = basename(file.path);
  }
  if (close) {
    close.innerHTML = getCloseIconSvg();
  }

  installTooltip(tab, file.pinned ? file.path : `${file.path} (preview tab)`);
  return tab;
}

function onTabsBarClick(event: Event): void {
  const close = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    ".pr-file-explorer-tab-close"
  );
  const tab = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    `.${FILE_TAB_CLASS}`
  );
  if (!tab) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const path = tab.dataset["filePath"] as FilePath | undefined;
  if (!path) {
    return;
  }

  if (close) {
    unpinFile(path);
    return;
  }

  const diffId = tab.dataset["diffId"];
  const region = diffId ? document.getElementById(diffId) : null;
  if (region) {
    scrollToRegion(region);
  }
}

function onTabsBarDoubleClick(event: Event): void {
  const tab = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    `.${FILE_TAB_CLASS}`
  );
  if (!tab) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const path = tab.dataset["filePath"] as FilePath | undefined;
  const diffId = tab.dataset["diffId"];
  if (path && diffId) {
    pinFile(path, diffId);
  }
}

function unpinFile(path: FilePath): void {
  const index = openFiles.findIndex((file) => file.path === path);
  if (index >= 0) {
    openFiles.splice(index, 1);
  }
  refreshFileTabs();
}

function scrollToRegion(region: HTMLElement): void {
  const targetTop =
    region.getBoundingClientRect().top +
    window.scrollY -
    getStickyHeaderOffset() -
    getTabsBarHeight() -
    FILE_HEADER_GAP_PX;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}

function updatePinButtons(): void {
  document
    .querySelectorAll<HTMLElement>(`.${FILE_TAB_PIN_BUTTON_CLASS}`)
    .forEach((button) => {
      const path = button.dataset["filePath"] as FilePath | undefined;
      const pinned = Boolean(
        path && openFiles.some((file) => file.path === path && file.pinned)
      );
      button.dataset["pinned"] = pinned ? "true" : "false";
      button.title = pinned ? "Unpin file tab" : "Pin file tab";
      updateTooltipText(button, pinned ? "Unpin file tab" : "Pin file tab");
    });
}

function isActiveFile(file: OpenFile): boolean {
  const region = document.getElementById(file.diffId);
  if (!region) {
    return false;
  }

  const top = getStickyHeaderOffset() + getTabsBarHeight();
  const height = window.innerHeight || document.documentElement.clientHeight;
  const middle = top + (height - top) / 2;
  const rect = region.getBoundingClientRect();
  return rect.top <= middle && rect.bottom >= middle;
}

function onViewportChange(): void {
  if (!installed) {
    return;
  }
  const bar = ensureBarMounted();
  syncStickyLayout(bar);
  updateActiveTabState();
}

function syncStickyLayout(bar: HTMLElement): void {
  const hasMount = Boolean(getTabsMountTarget());
  const visible = hasMount && openFiles.length > 0;
  const stickyOffset = getStickyHeaderOffset();

  bar.style.setProperty(TABS_STICKY_TOP_PROPERTY, `${stickyOffset}px`);
  bar.dataset["visible"] = visible ? "true" : "false";

  if (!visible) {
    bar.dataset["visible"] = "false";
    resetFileHeaderOffsets();
    return;
  }

  applyFileHeaderOffsets(getTabsBarHeight());
}

function updateActiveTabState(): void {
  const bar = document.querySelector<HTMLElement>(`.${FILE_TABS_BAR_CLASS}`);
  if (!bar) {
    return;
  }
  bar.querySelectorAll<HTMLElement>(`.${FILE_TAB_CLASS}`).forEach((tab) => {
    const path = tab.dataset["filePath"] as FilePath | undefined;
    const file = openFiles.find((candidate) => candidate.path === path);
    tab.dataset["active"] = file && isActiveFile(file) ? "true" : "false";
  });
}

function getTabsBarHeight(): number {
  const bar = document.querySelector<HTMLElement>(`.${FILE_TABS_BAR_CLASS}`);
  if (!bar || bar.dataset["visible"] !== "true") {
    return 0;
  }
  return bar.getBoundingClientRect().height;
}

function applyFileHeaderOffsets(offset: number): void {
  if (!offset) {
    resetFileHeaderOffsets();
    return;
  }

  for (const region of getDiffRegions()) {
    const wrapper = region.querySelector<HTMLElement>(
      "[class*='diffHeaderWrapper']"
    );
    if (!wrapper) {
      continue;
    }

    const current = getHeaderStickyOffset(wrapper);
    const previousApplied = wrapper.dataset[APPLIED_STICKY_OFFSET_KEY];
    const original =
      wrapper.dataset[ORIGINAL_STICKY_OFFSET_KEY] === undefined ||
      (previousApplied && current !== previousApplied)
        ? current
        : wrapper.dataset[ORIGINAL_STICKY_OFFSET_KEY] ?? "";
    const next = formatHeaderStickyOffset(original, offset);

    wrapper.dataset[ORIGINAL_STICKY_OFFSET_KEY] = original;
    wrapper.dataset[APPLIED_STICKY_OFFSET_KEY] = next;
    wrapper.style.setProperty(HEADER_STICKY_OFFSET_PROPERTY, next);
  }
}

function resetFileHeaderOffsets(): void {
  for (const region of getDiffRegions()) {
    const wrapper = region.querySelector<HTMLElement>(
      "[class*='diffHeaderWrapper']"
    );
    if (!wrapper) {
      continue;
    }
    const original = wrapper.dataset[ORIGINAL_STICKY_OFFSET_KEY];
    if (original === undefined) {
      continue;
    }
    const current = getHeaderStickyOffset(wrapper);
    const previousApplied = wrapper.dataset[APPLIED_STICKY_OFFSET_KEY];
    const restoreValue =
      previousApplied && current !== previousApplied ? current : original;

    if (restoreValue) {
      wrapper.style.setProperty(HEADER_STICKY_OFFSET_PROPERTY, restoreValue);
    } else {
      wrapper.style.removeProperty(HEADER_STICKY_OFFSET_PROPERTY);
    }
    delete wrapper.dataset[ORIGINAL_STICKY_OFFSET_KEY];
    delete wrapper.dataset[APPLIED_STICKY_OFFSET_KEY];
  }
}

function getHeaderStickyOffset(wrapper: HTMLElement): string {
  return wrapper.style.getPropertyValue(HEADER_STICKY_OFFSET_PROPERTY).trim();
}

function formatHeaderStickyOffset(original: string, offset: number): string {
  return original ? `calc(${original} + ${offset}px)` : `${offset}px`;
}
