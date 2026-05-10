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
import {
  ensureStickyStack,
  getStickyChromeBelowHeaderHeight,
  getStickyMountTarget,
  getStickyStackFromChild,
  maybeRemoveStickyStackIfEmpty,
  placeFileTabsBarInStack,
  STICKY_STACK_TOP_PROPERTY,
} from "../stickyDiffChrome/stickyDiffChrome";

interface OpenFile {
  path: FilePath;
  diffId: string;
  pinned: boolean;
}

const ORIGINAL_STICKY_OFFSET_KEY = "prFileExplorerOriginalStickyOffset";
const APPLIED_STICKY_OFFSET_KEY = "prFileExplorerAppliedStickyOffset";
const HEADER_STICKY_OFFSET_PROPERTY = "--header-sticky-offset";
const FILE_HEADER_GAP_PX = 4;
const STORAGE_KEY_PREFIX = "prFileExplorer.fileTabs.";
const TAB_CONTEXT_MENU_CLASS = "pr-file-explorer-tab-menu";
const TAB_CONTEXT_MENU_ITEM_CLASS = "pr-file-explorer-tab-menu-item";
const TAB_DRAG_THRESHOLD_PX = 5;
const TAB_DRAG_EDGE_SIZE_PX = 44;
const TAB_DRAG_SCROLL_STEP_PX = 18;

interface TabDragState {
  path: FilePath;
  pointerId: number;
  startX: number;
  startY: number;
  latestX: number;
  latestY: number;
  bar: HTMLElement;
  tab: HTMLElement;
  active: boolean;
  frameId: number | null;
  ghost: HTMLElement | null;
  ghostOffsetX: number;
  ghostOffsetY: number;
  ghostWidth: number;
  ghostHeight: number;
}

const openFiles: OpenFile[] = [];
let installed = false;
let scrollListener: (() => void) | null = null;
let resizeListener: (() => void) | null = null;
let documentClickListener: ((event: MouseEvent) => void) | null = null;
let documentKeydownListener: ((event: KeyboardEvent) => void) | null = null;
let loadedStorageKey: string | null = null;
let tabDragState: TabDragState | null = null;
let suppressNextTabClick = false;

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
  cancelTabDrag();
  document.querySelector<HTMLElement>(`.${FILE_TABS_BAR_CLASS}`)?.remove();
  maybeRemoveStickyStackIfEmpty();
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

function ensureBarMounted(): HTMLElement {
  let bar = document.querySelector<HTMLElement>(`.${FILE_TABS_BAR_CLASS}`);
  if (!bar) {
    bar = createTabsBar();
  }

  const stack = ensureStickyStack();
  if (!stack) {
    if (!bar.isConnected) {
      document.body.appendChild(bar);
    }
    return bar;
  }

  placeFileTabsBarInStack(stack, bar);
  return bar;
}

function createTabsBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.className = FILE_TABS_BAR_CLASS;
  bar.dataset["visible"] = "false";
  bar.addEventListener("click", onTabsBarClick);
  bar.addEventListener("dblclick", onTabsBarDoubleClick);
  bar.addEventListener("contextmenu", onTabsBarContextMenu);
  bar.addEventListener("pointerdown", onTabsBarPointerDown);
  bar.addEventListener("pointermove", onTabsBarPointerMove);
  bar.addEventListener("pointerup", onTabsBarPointerUp);
  bar.addEventListener("pointercancel", onTabsBarPointerCancel);
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
  if (suppressNextTabClick) {
    suppressNextTabClick = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }

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

function onTabsBarPointerDown(event: PointerEvent): void {
  if (event.button !== 0 || tabDragState) {
    return;
  }

  const tab = getTabFromEvent(event);
  const path = tab?.dataset["filePath"] as FilePath | undefined;
  const bar = event.currentTarget as HTMLElement | null;
  const target = event.target as HTMLElement | null;
  const close = target?.closest<HTMLElement>(".pr-file-explorer-tab-close");
  if (
    !bar ||
    !tab ||
    !path ||
    close ||
    openFiles.findIndex((file) => file.path === path) < 0
  ) {
    return;
  }

  hideTabContextMenu();
  tabDragState = {
    path,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    latestX: event.clientX,
    latestY: event.clientY,
    bar,
    tab,
    active: false,
    frameId: null,
    ghost: null,
    ghostOffsetX: 0,
    ghostOffsetY: 0,
    ghostWidth: 0,
    ghostHeight: 0,
  };

  try {
    tab.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture is best-effort; mouse dragging still works without it.
  }
}

function onTabsBarPointerMove(event: PointerEvent): void {
  const state = tabDragState;
  if (!state || event.pointerId !== state.pointerId) {
    return;
  }

  state.latestX = event.clientX;
  state.latestY = event.clientY;

  if (!state.active && !hasPassedDragThreshold(state)) {
    return;
  }

  if (!state.active) {
    activateTabDrag(state);
  }

  event.preventDefault();
  scheduleTabDragFrame(state);
}

function onTabsBarPointerUp(event: PointerEvent): void {
  const state = tabDragState;
  if (!state || event.pointerId !== state.pointerId) {
    return;
  }

  finishTabDrag(state, event, true);
}

function onTabsBarPointerCancel(event: PointerEvent): void {
  const state = tabDragState;
  if (!state || event.pointerId !== state.pointerId) {
    return;
  }

  finishTabDrag(state, event, true);
  suppressNextTabClick = false;
}

function getTabFromEvent(event: Event): HTMLElement | null {
  return (
    (event.target as HTMLElement | null)?.closest<HTMLElement>(
      `.${FILE_TAB_CLASS}`
    ) ?? null
  );
}

function hasPassedDragThreshold(state: TabDragState): boolean {
  return (
    Math.hypot(state.latestX - state.startX, state.latestY - state.startY) >=
    TAB_DRAG_THRESHOLD_PX
  );
}

function activateTabDrag(state: TabDragState): void {
  state.active = true;
  suppressNextTabClick = true;
  state.bar.dataset["reordering"] = "true";
  state.tab.dataset["dragging"] = "true";

  const rect = state.tab.getBoundingClientRect();
  state.ghostOffsetX = state.startX - rect.left;
  state.ghostOffsetY = state.startY - rect.top;
  state.ghostWidth = rect.width;
  state.ghostHeight = rect.height;
  state.ghost = createDragGhost(state.tab);
  document.body.appendChild(state.ghost);
  positionDragGhost(state);
  updateDropIndicator(state.bar, state.latestX, state.path);
}

function createDragGhost(tab: HTMLElement): HTMLElement {
  const ghost = tab.cloneNode(true) as HTMLElement;
  ghost.classList.add("pr-file-explorer-tab-ghost");
  ghost.removeAttribute("id");
  delete ghost.dataset["dragging"];
  delete ghost.dataset["dropPosition"];
  ghost.setAttribute("aria-hidden", "true");
  ghost.tabIndex = -1;
  return ghost;
}

function positionDragGhost(state: TabDragState): void {
  if (!state.ghost) {
    return;
  }
  const left = state.latestX - state.ghostOffsetX;
  const top = state.latestY - state.ghostOffsetY;
  state.ghost.style.width = `${state.ghostWidth}px`;
  state.ghost.style.height = `${state.ghostHeight}px`;
  state.ghost.style.transform = `translate(${left}px, ${top}px)`;
}

function scheduleTabDragFrame(state: TabDragState): void {
  if (state.frameId !== null) {
    return;
  }

  state.frameId = window.requestAnimationFrame(() => {
    state.frameId = null;
    if (tabDragState !== state || !state.active) {
      return;
    }

    const scrolled = scrollTabsBarForPointer(state.bar, state.latestX);
    positionDragGhost(state);
    updateDropIndicator(state.bar, state.latestX, state.path);
    if (scrolled) {
      scheduleTabDragFrame(state);
    }
  });
}

function updateDropIndicator(
  bar: HTMLElement,
  clientX: number,
  draggedPath: FilePath
): void {
  clearDropIndicator(bar);

  const tabs = Array.from(
    bar.querySelectorAll<HTMLElement>(`.${FILE_TAB_CLASS}`)
  ).filter((tab) => tab.dataset["filePath"] !== draggedPath);
  if (tabs.length === 0) {
    return;
  }

  for (const tab of tabs) {
    const rect = tab.getBoundingClientRect();
    if (clientX < rect.left + rect.width / 2) {
      tab.dataset["dropPosition"] = "before";
      return;
    }
  }

  const lastTab = tabs[tabs.length - 1];
  if (lastTab) {
    lastTab.dataset["dropPosition"] = "after";
  }
}

function clearDropIndicator(bar: HTMLElement): void {
  bar
    .querySelectorAll<HTMLElement>(`.${FILE_TAB_CLASS}[data-drop-position]`)
    .forEach((tab) => delete tab.dataset["dropPosition"]);
}

function scrollTabsBarForPointer(bar: HTMLElement, clientX: number): boolean {
  const rect = bar.getBoundingClientRect();
  const before = bar.scrollLeft;

  if (clientX - rect.left < TAB_DRAG_EDGE_SIZE_PX) {
    bar.scrollLeft -= TAB_DRAG_SCROLL_STEP_PX;
  } else if (rect.right - clientX < TAB_DRAG_EDGE_SIZE_PX) {
    bar.scrollLeft += TAB_DRAG_SCROLL_STEP_PX;
  }

  return bar.scrollLeft !== before;
}

function getPointerInsertionIndex(
  bar: HTMLElement,
  clientX: number,
  draggedPath: FilePath
): number {
  const tabs = Array.from(
    bar.querySelectorAll<HTMLElement>(`.${FILE_TAB_CLASS}`)
  ).filter((tab) => tab.dataset["filePath"] !== draggedPath);

  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    if (!tab) {
      continue;
    }

    const rect = tab.getBoundingClientRect();
    if (clientX < rect.left + rect.width / 2) {
      return index;
    }
  }

  return tabs.length;
}

function moveOpenFileToIndex(path: FilePath, insertionIndex: number): boolean {
  const currentIndex = openFiles.findIndex((file) => file.path === path);
  if (currentIndex < 0) {
    return false;
  }

  const [file] = openFiles.splice(currentIndex, 1);
  if (!file) {
    return false;
  }

  const nextIndex = Math.max(0, Math.min(insertionIndex, openFiles.length));
  if (nextIndex === currentIndex) {
    openFiles.splice(currentIndex, 0, file);
    return false;
  }

  openFiles.splice(nextIndex, 0, file);
  return true;
}

function finishTabDrag(
  state: TabDragState,
  event: PointerEvent,
  shouldPersist: boolean
): void {
  if (state.active) {
    event.preventDefault();
  }

  if (state.frameId !== null) {
    window.cancelAnimationFrame(state.frameId);
  }

  try {
    state.tab.releasePointerCapture(state.pointerId);
  } catch {
    // Pointer capture may already be released when the browser cancels input.
  }

  let moved = false;
  if (state.active) {
    const targetIndex = getPointerInsertionIndex(
      state.bar,
      state.latestX,
      state.path
    );
    moved = moveOpenFileToIndex(state.path, targetIndex);
  }

  state.ghost?.remove();
  state.ghost = null;
  clearDropIndicator(state.bar);
  delete state.bar.dataset["reordering"];
  delete state.tab.dataset["dragging"];
  tabDragState = null;

  if (state.active && shouldPersist) {
    if (moved) {
      refreshFileTabs();
    } else {
      updateActiveTabState();
    }
  }
}

function cancelTabDrag(): void {
  const state = tabDragState;
  if (!state) {
    return;
  }

  if (state.frameId !== null) {
    window.cancelAnimationFrame(state.frameId);
  }

  try {
    state.tab.releasePointerCapture(state.pointerId);
  } catch {
    // Pointer capture may already be released during teardown.
  }

  state.ghost?.remove();
  state.ghost = null;
  clearDropIndicator(state.bar);
  delete state.bar.dataset["reordering"];
  delete state.tab.dataset["dragging"];
  tabDragState = null;
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
  const hasMount = Boolean(getStickyMountTarget());
  const visible = hasMount && openFiles.length > 0;
  const stickyOffset = getStickyHeaderOffset();

  const stack = getStickyStackFromChild(bar);
  const stickyTarget = stack ?? bar;
  stickyTarget.style.setProperty(STICKY_STACK_TOP_PROPERTY, `${stickyOffset}px`);
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
  return getStickyChromeBelowHeaderHeight();
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

/** Exported for explorer sync viewport alignment with file tabs. */
export function getFileTabsBarHeight(): number {
  return getTabsBarHeight();
}
