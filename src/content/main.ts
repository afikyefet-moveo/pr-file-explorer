import {
  getSettings,
  onSettingsChanged,
  type Settings,
} from "../shared/settings";
import { debugLog, safely } from "../shared/diagnostics";
import {
  enhanceFileHeaders,
  uninstallFileHeaderEnhancements,
} from "./enhanceFileHeaders";
import {
  installFileTabs,
  refreshFileTabs,
  uninstallFileTabs,
} from "../features/fileTabs/fileTabs";
import {
  installGoToTopButton,
  uninstallGoToTopButton,
  type GoToTopController,
} from "./goToTopButton";
import { observeGitHubUpdates } from "./observeGitHubUpdates";
import {
  installReviewFlowRail,
  refreshReviewFlow,
  uninstallReviewFlowRail,
} from "../features/reviewFlow/reviewFlow";
import type { ReviewRailControls } from "../features/reviewFlow/types";
import {
  installPageTopShortcut,
  uninstallPageTopShortcut,
  updatePageTopShortcut,
} from "./pageTopShortcut";
import {
  installExplorerSync,
  refreshExplorerSync,
  uninstallExplorerSync,
} from "../features/explorerSync/explorerSync";
import { hideTooltip } from "../shared/tooltip";
import { TOP_BUTTON_CLASS } from "../shared/constants";

let cachedSettings: Settings | null = null;
let goToTop: GoToTopController | null = null;
let activeOnCurrentRoute = false;
let lastPathname: string | null = null;

async function init(): Promise<void> {
  cachedSettings = await getSettings();
  debugLog("content script initialized", cachedSettings);

  syncForCurrentRoute({ forceFullApply: true });
  observeGitHubUpdates(({ requiresFullSync, urlChanged }) => {
    safely("sync route enhancements", () =>
      syncForCurrentRoute({ forceFullApply: requiresFullSync || urlChanged })
    );
  });

  onSettingsChanged((next) => {
    cachedSettings = next;
    syncForCurrentRoute({ forceFullApply: true });
  });
}

export function isSupportedPrFilesRoute(pathname: string): boolean {
  return /^\/[^/]+\/[^/]+\/pull\/\d+\/(?:files|changes)\/?$/.test(pathname);
}

function syncForCurrentRoute({
  forceFullApply,
}: {
  forceFullApply: boolean;
}): void {
  const pathname = location.pathname;
  const routeChanged = lastPathname !== null && pathname !== lastPathname;
  lastPathname = pathname;

  const shouldBeActive = isSupportedPrFilesRoute(pathname);

  if (!shouldBeActive) {
    if (activeOnCurrentRoute || routeChanged || forceFullApply) {
      safely("uninstall enhancements", uninstallAll);
    }
    activeOnCurrentRoute = false;
    return;
  }

  if (activeOnCurrentRoute && routeChanged) {
    safely("reset route enhancements", uninstallAll);
  }

  activeOnCurrentRoute = true;

  if (forceFullApply || routeChanged) {
    applyAll();
    return;
  }

  safely("refresh enhancements", applyEnhancements);
}

function applyAll(): void {
  if (!cachedSettings || !activeOnCurrentRoute) {
    return;
  }

  safely("apply enhancements", applyEnhancements);
  safely("apply back to top", applyGoToTop);
  safely("apply review flow", applyReviewFlow);
  safely("apply file tabs", applyFileTabs);
  safely("apply explorer sync", applyExplorerSync);
  safely("apply page top shortcut", applyPageTopShortcut);
}

function uninstallAll(): void {
  uninstallFileHeaderEnhancements();
  goToTop?.uninstall();
  goToTop = null;
  uninstallGoToTopButton();
  uninstallReviewFlowRail();
  uninstallFileTabs();
  uninstallPageTopShortcut();
  uninstallExplorerSync();
  hideTooltip();
}

function applyEnhancements(): void {
  if (!cachedSettings || !activeOnCurrentRoute) {
    return;
  }
  enhanceFileHeaders({
    withLocateButton: cachedSettings.locateEnabled,
    withEditorButton: cachedSettings.editorEnabled,
  });
  if (cachedSettings.reviewFlowEnabled) {
    refreshReviewFlow(getReviewRailControls(cachedSettings));
  }
  if (cachedSettings.fileTabsEnabled) {
    refreshFileTabs();
  }
  if (cachedSettings.explorerSyncEnabled) {
    refreshExplorerSync();
  }
}

function applyGoToTop(): void {
  if (!cachedSettings || !activeOnCurrentRoute) {
    return;
  }
  if (!cachedSettings.backToTopEnabled) {
    goToTop?.uninstall();
    goToTop = null;
    uninstallGoToTopButton();
    return;
  }

  const bindings = {
    click: cachedSettings.backToTopClickAction,
    shiftClick: cachedSettings.backToTopShiftClickAction,
  };

  if (goToTop && !document.querySelector(`.${TOP_BUTTON_CLASS}`)) {
    goToTop.uninstall();
    goToTop = null;
  }

  if (goToTop) {
    goToTop.setBindings(bindings);
    return;
  }

  goToTop = installGoToTopButton(bindings);
}

function applyReviewFlow(): void {
  if (!cachedSettings || !activeOnCurrentRoute) {
    return;
  }

  if (!cachedSettings.reviewFlowEnabled) {
    uninstallReviewFlowRail();
    return;
  }

  const controls = getReviewRailControls(cachedSettings);
  installReviewFlowRail(controls);
  refreshReviewFlow(controls);
}

function applyFileTabs(): void {
  if (!cachedSettings || !activeOnCurrentRoute) {
    return;
  }

  if (!cachedSettings.fileTabsEnabled) {
    uninstallFileTabs();
    return;
  }

  installFileTabs();
  refreshFileTabs();
}

function applyExplorerSync(): void {
  if (!cachedSettings || !activeOnCurrentRoute) {
    return;
  }

  if (!cachedSettings.explorerSyncEnabled) {
    uninstallExplorerSync();
    return;
  }

  installExplorerSync();
}

function applyPageTopShortcut(): void {
  if (!cachedSettings || !activeOnCurrentRoute) {
    return;
  }

  if (!cachedSettings.pageTopShortcutEnabled) {
    uninstallPageTopShortcut();
    return;
  }

  installPageTopShortcut(cachedSettings.pageTopShortcut);
  updatePageTopShortcut(cachedSettings.pageTopShortcut);
}

function getReviewRailControls(settings: Settings): ReviewRailControls {
  return {
    previousComment: settings.reviewFlowPreviousCommentEnabled,
    nextComment: settings.reviewFlowNextCommentEnabled,
    nextUnviewed: settings.reviewFlowNextUnviewedEnabled,
    copyContext: settings.reviewFlowCopyContextEnabled,
    copyCommentsToAgent: settings.reviewFlowCopyCommentsToAgentEnabled,
  };
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      void init();
    },
    { once: true }
  );
} else {
  void init();
}
