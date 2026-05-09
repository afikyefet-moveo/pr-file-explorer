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
  normalizePath,
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
const STORAGE_KEY_PREFIX = "prFileExplorer.fileTabs.";
const TAB_CONTEXT_MENU_CLASS = "pr-file-explorer-tab-menu";
const TAB_CONTEXT_MENU_ITEM_CLASS = "pr-file-explorer-tab-menu-item";
const TAB_DRAG_DATA_TYPE = "application/x-pr-file-explorer-tab";

const openFiles: OpenFile[] = [];
let installed = false;
let scrollListener: (() => void) | null = null;
let resizeListener: (() => void) | null = null;
let documentClickListener: ((event: MouseEvent) => void) | null = null;
let documentKeydownListener: ((event: KeyboardEvent) => void) | null = null;
let loadedStorageKey: string | null = null;

export function installFileTabs(): void {
  if (installed) {
    return;
  }

  ensureBarMounted();
  scrollListener = () => onViewportChange();
  resizeListener = () => onViewportChange();
  documentClickListener = (event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest(`.${TAB_CONTEXT_MENU_CLASS}`)) {
      hideTabContextMenu();
    }
  };
  documentKeydownListener = (event) => {
    if (event.key === "Escape") {
      hideTabContextMenu();
    }
  };
  window.addEventListener("scroll", scrollListener, { passive: true });
  window.addEventListener("resize", resizeListener);
  document.addEventListener("click", documentClickListener, true);
  document.addEventListener("keydown", documentKeydownListener);
  installed = true;
  refreshFileTabs();
}

function syncOpenFilesWithStorageScope(): void {
  const storageKey = getPrTabsStorageKey();
  if (storageKey === loadedStorageKey) {
    return;
  }

  loadedStorageKey = storageKey;
  openFiles.splice(0, openFiles.length, ...loadOpenFiles(storageKey));
}

function getPrTabsStorageKey(): string | null {
  const match = location.pathname.match(
    /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/
  );
  if (!match) {
    return null;
  }

  const [, owner = "", repo = "", pullNumber = ""] = match;
  return `${STORAGE_KEY_PREFIX}${[
    location.hostname,
    owner,
    repo,
    pullNumber,
  ]
    .map((part) => encodeURIComponent(part))
    .join(":")}`;
}

function loadOpenFiles(storageKey: string | null): OpenFile[] {
  if (!storageKey) {
    return [];
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const files: OpenFile[] = [];
    for (const item of parsed) {
      if (!isRecord(item)) {
        continue;
      }

      const path = normalizePath(
        typeof item["path"] === "string" ? item["path"] : ""
      );
      if (!path) {
        continue;
      }

      const existingIndex = files.findIndex((file) => file.path === path);
      if (existingIndex >= 0) {
        files.splice(existingIndex, 1);
      }

      if (!item["pinned"]) {
        const previewIndex = files.findIndex((file) => !file.pinned);
        if (previewIndex >= 0) {
          files.splice(previewIndex, 1);
        }
      }

      files.push({
        path,
        diffId: typeof item["diffId"] === "string" ? item["diffId"] : "",
        pinned: Boolean(item["pinned"]),
      });
    }

    return files;
  } catch {
    return [];
  }
}

function persistOpenFiles(): void {
  const storageKey = loadedStorageKey ?? getPrTabsStorageKey();
  if (!storageKey) {
    return;
  }

  try {
    if (!openFiles.length) {
      localStorage.removeItem(storageKey);
      return;
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify(
        openFiles.map((file) => ({
          path: file.path,
          diffId: file.diffId,
          pinned: file.pinned,
        }))
      )
    );
  } catch {
    // GitHub can run with storage disabled in some browser modes.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function refreshFileTabs(): void {
  if (!installed) {
    return;
  }

  syncOpenFilesWithStorageScope();
  const bar = ensureBarMounted();
  enhanceFileHeadersForTabs();
  syncOpenFilesWithDom();
  renderTabs(bar);
  updatePinButtons();
  syncStickyLayout(bar);
  updateActiveTabState();
  persistOpenFiles();
}

export function uninstallFileTabs(): void {
  document.querySelector<HTMLElement>(`.${FILE_TABS_BAR_CLASS}`)?.remove();
  hideTabContextMenu();
  getTabContextMenu()?.remove();
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
  if (documentClickListener) {
    document.removeEventListener("click", documentClickListener, true);
    documentClickListener = null;
  }
  if (documentKeydownListener) {
    document.removeEventListener("keydown", documentKeydownListener);
    documentKeydownListener = null;
  }

  resetFileHeaderOffsets();
  openFiles.splice(0, openFiles.length);
  loadedStorageKey = null;
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
  bar.addEventListener("contextmenu", onTabsBarContextMenu);
  bar.addEventListener("dragstart", onTabsBarDragStart);
  bar.addEventListener("dragenter", onTabsBarDragEnter);
  bar.addEventListener("dragover", onTabsBarDragOver);
  bar.addEventListener("dragleave", onTabsBarDragLeave);
  bar.addEventListener("drop", onTabsBarDrop);
  bar.addEventListener("dragend", onTabsBarDragEnd);
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
  tab.draggable = true;
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
  const region = getRegionForTab(path, diffId);
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

function onTabsBarContextMenu(event: MouseEvent): void {
  const tab = getTabFromEvent(event);
  const path = tab?.dataset["filePath"] as FilePath | undefined;
  if (!path) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  showTabContextMenu(path, event.clientX, event.clientY);
}

function onTabsBarDragStart(event: DragEvent): void {
  const tab = getTabFromEvent(event);
  const path = tab?.dataset["filePath"] as FilePath | undefined;
  if (!tab || !path || openFiles.findIndex((file) => file.path === path) < 0) {
    event.preventDefault();
    return;
  }

  hideTabContextMenu();
  tab.dataset["dragging"] = "true";
  event.dataTransfer?.setData(TAB_DRAG_DATA_TYPE, path);
  event.dataTransfer?.setData("text/plain", path);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function onTabsBarDragEnter(event: DragEvent): void {
  const bar = event.currentTarget as HTMLElement | null;
  if (!bar || !getDraggedTabPath(bar, event)) {
    return;
  }
  event.preventDefault();
}

function onTabsBarDragLeave(event: DragEvent): void {
  const bar = event.currentTarget as HTMLElement | null;
  if (!bar) {
    return;
  }
  const related = event.relatedTarget as Node | null;
  if (!related || !bar.contains(related)) {
    clearDropIndicator(bar);
  }
}

function onTabsBarDragOver(event: DragEvent): void {
  const bar = event.currentTarget as HTMLElement | null;
  if (!bar || !getDraggedTabPath(bar, event)) {
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  scrollTabsBarForDrag(bar, event);
  updateDropIndicator(bar, event);
}

function onTabsBarDrop(event: DragEvent): void {
  const bar = event.currentTarget as HTMLElement | null;
  const path = bar ? getDraggedTabPath(bar, event) : null;
  if (!bar || !path) {
    return;
  }

  event.preventDefault();
  clearDragState(bar);
  const fromIndex = openFiles.findIndex((file) => file.path === path);
  moveOpenFile(fromIndex, getDropIndex(bar, event));
}

function onTabsBarDragEnd(event: DragEvent): void {
  const bar = event.currentTarget as HTMLElement | null;
  if (bar) {
    clearDragState(bar);
  }
}

function getTabFromEvent(event: Event): HTMLElement | null {
  return (
    (event.target as HTMLElement | null)?.closest<HTMLElement>(
      `.${FILE_TAB_CLASS}`
    ) ?? null
  );
}

function getDraggedTabPath(
  bar: HTMLElement,
  event: DragEvent
): FilePath | null {
  const transferred =
    event.dataTransfer?.getData(TAB_DRAG_DATA_TYPE) ??
    event.dataTransfer?.getData("text/plain") ??
    "";
  const path =
    transferred ||
    bar.querySelector<HTMLElement>(`.${FILE_TAB_CLASS}[data-dragging="true"]`)
      ?.dataset["filePath"];

  return path ? (path as FilePath) : null;
}

function scrollTabsBarForDrag(bar: HTMLElement, event: DragEvent): void {
  const rect = bar.getBoundingClientRect();
  const edgeSize = 40;
  if (event.clientX - rect.left < edgeSize) {
    bar.scrollLeft -= 18;
  } else if (rect.right - event.clientX < edgeSize) {
    bar.scrollLeft += 18;
  }
}

function getDroppableTabs(bar: HTMLElement): HTMLElement[] {
  return Array.from(
    bar.querySelectorAll<HTMLElement>(`.${FILE_TAB_CLASS}`)
  ).filter((tab) => tab.dataset["dragging"] !== "true");
}

function updateDropIndicator(bar: HTMLElement, event: DragEvent): void {
  clearDropIndicator(bar);

  const tabs = getDroppableTabs(bar);
  if (tabs.length === 0) {
    return;
  }

  for (const tab of tabs) {
    const rect = tab.getBoundingClientRect();
    if (event.clientX < rect.left + rect.width / 2) {
      tab.dataset["dropPosition"] = "before";
      return;
    }
  }

  const lastTab = tabs[tabs.length - 1];
  if (lastTab) {
    lastTab.dataset["dropPosition"] = "after";
  }
}

function getDropIndex(bar: HTMLElement, event: DragEvent): number {
  const tabs = getDroppableTabs(bar);
  for (const tab of tabs) {
    const rect = tab.getBoundingClientRect();
    if (event.clientX < rect.left + rect.width / 2) {
      const path = tab.dataset["filePath"] as FilePath | undefined;
      const index = openFiles.findIndex((file) => file.path === path);
      return index < 0 ? openFiles.length : index;
    }
  }
  return openFiles.length;
}

function clearDragState(bar: HTMLElement): void {
  bar.querySelectorAll<HTMLElement>(`.${FILE_TAB_CLASS}`).forEach((tab) => {
    delete tab.dataset["dragging"];
    delete tab.dataset["dropPosition"];
  });
}

function clearDropIndicator(bar: HTMLElement): void {
  bar.querySelectorAll<HTMLElement>(
    `.${FILE_TAB_CLASS}[data-drop-position]`
  ).forEach((tab) => {
    delete tab.dataset["dropPosition"];
  });
}

type TabContextCommand =
  | "togglePinned"
  | "close"
  | "closeOthers"
  | "closeLeft"
  | "closeRight"
  | "closeAll"
  | "copyPath";

function showTabContextMenu(path: FilePath, x: number, y: number): void {
  const menu = ensureTabContextMenu();
  const file = openFiles.find((candidate) => candidate.path === path);
  const index = openFiles.findIndex((candidate) => candidate.path === path);
  if (!file || index < 0) {
    hideTabContextMenu();
    return;
  }

  menu.dataset["filePath"] = path;
  menu.replaceChildren(
    createTabMenuItem(file.pinned ? "Unpin Tab" : "Pin Tab", "togglePinned"),
    createTabMenuSeparator(),
    createTabMenuItem("Close", "close"),
    createTabMenuItem("Close Others", "closeOthers", openFiles.length <= 1),
    createTabMenuItem("Close Tabs to the Left", "closeLeft", index === 0),
    createTabMenuItem(
      "Close Tabs to the Right",
      "closeRight",
      index === openFiles.length - 1
    ),
    createTabMenuItem("Close All", "closeAll"),
    createTabMenuSeparator(),
    createTabMenuItem("Copy Path", "copyPath")
  );
  menu.dataset["visible"] = "true";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  const rect = menu.getBoundingClientRect();
  const margin = 8;
  menu.style.left = `${Math.max(
    margin,
    Math.min(x, window.innerWidth - rect.width - margin)
  )}px`;
  menu.style.top = `${Math.max(
    margin,
    Math.min(y, window.innerHeight - rect.height - margin)
  )}px`;
}

function ensureTabContextMenu(): HTMLElement {
  let menu = getTabContextMenu();
  if (!menu) {
    menu = document.createElement("div");
    menu.className = TAB_CONTEXT_MENU_CLASS;
    menu.dataset["visible"] = "false";
    menu.setAttribute("role", "menu");
    menu.addEventListener("click", onTabContextMenuClick);
    document.body.appendChild(menu);
  }
  return menu;
}

function getTabContextMenu(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.${TAB_CONTEXT_MENU_CLASS}`);
}

function createTabMenuItem(
  label: string,
  command: TabContextCommand,
  disabled = false
): HTMLButtonElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = TAB_CONTEXT_MENU_ITEM_CLASS;
  item.dataset["command"] = command;
  item.disabled = disabled;
  item.setAttribute("role", "menuitem");
  item.textContent = label;
  return item;
}

function createTabMenuSeparator(): HTMLElement {
  const separator = document.createElement("div");
  separator.className = "pr-file-explorer-tab-menu-separator";
  separator.setAttribute("role", "separator");
  return separator;
}

function onTabContextMenuClick(event: Event): void {
  event.preventDefault();
  event.stopPropagation();

  const item = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
    `.${TAB_CONTEXT_MENU_ITEM_CLASS}`
  );
  if (!item || item.disabled) {
    return;
  }

  const menu = item.closest<HTMLElement>(`.${TAB_CONTEXT_MENU_CLASS}`);
  const path = menu?.dataset["filePath"] as FilePath | undefined;
  const command = item.dataset["command"] as TabContextCommand | undefined;
  if (!path || !command) {
    hideTabContextMenu();
    return;
  }

  runTabContextCommand(command, path);
  hideTabContextMenu();
}

function runTabContextCommand(command: TabContextCommand, path: FilePath): void {
  switch (command) {
    case "togglePinned":
      togglePinnedTab(path);
      break;
    case "close":
      unpinFile(path);
      break;
    case "closeOthers":
      closeOtherTabs(path);
      break;
    case "closeLeft":
      closeTabsToLeft(path);
      break;
    case "closeRight":
      closeTabsToRight(path);
      break;
    case "closeAll":
      closeAllTabs();
      break;
    case "copyPath":
      void navigator.clipboard?.writeText(path).catch(() => undefined);
      break;
  }
}

function hideTabContextMenu(): void {
  const menu = getTabContextMenu();
  if (!menu) {
    return;
  }

  menu.dataset["visible"] = "false";
  delete menu.dataset["filePath"];
}

function unpinFile(path: FilePath): void {
  const index = openFiles.findIndex((file) => file.path === path);
  if (index >= 0) {
    openFiles.splice(index, 1);
  }
  refreshFileTabs();
}

function closeOtherTabs(path: FilePath): void {
  const selected = openFiles.find((file) => file.path === path);
  openFiles.splice(0, openFiles.length, ...(selected ? [selected] : []));
  refreshFileTabs();
}

function closeTabsToLeft(path: FilePath): void {
  const index = openFiles.findIndex((file) => file.path === path);
  if (index > 0) {
    openFiles.splice(0, index);
  }
  refreshFileTabs();
}

function closeTabsToRight(path: FilePath): void {
  const index = openFiles.findIndex((file) => file.path === path);
  if (index >= 0) {
    openFiles.splice(index + 1);
  }
  refreshFileTabs();
}

function closeAllTabs(): void {
  openFiles.splice(0, openFiles.length);
  refreshFileTabs();
}

function togglePinnedTab(path: FilePath): void {
  const file = openFiles.find((candidate) => candidate.path === path);
  if (file) {
    if (file.pinned) {
      const previewIndex = openFiles.findIndex(
        (candidate) => !candidate.pinned && candidate.path !== path
      );
      if (previewIndex >= 0) {
        openFiles.splice(previewIndex, 1);
      }
    }
    file.pinned = !file.pinned;
  }
  refreshFileTabs();
}

function moveOpenFile(fromIndex: number, toIndex: number): void {
  if (fromIndex === toIndex || fromIndex < 0) {
    return;
  }

  const [file] = openFiles.splice(fromIndex, 1);
  if (!file) {
    return;
  }

  const nextIndex = Math.max(
    0,
    Math.min(toIndex > fromIndex ? toIndex - 1 : toIndex, openFiles.length)
  );
  openFiles.splice(nextIndex, 0, file);
  refreshFileTabs();
}

function getRegionForTab(
  path: FilePath,
  diffId: string | undefined
): HTMLElement | null {
  return (
    (diffId ? document.getElementById(diffId) : null) ??
    getDiffRegions().find(
      (candidate) => getFilePathFromDiffRegion(candidate) === path
    ) ??
    null
  );
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
