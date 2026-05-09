import {
  getSettings,
  onSettingsChanged,
  type Settings,
} from "../shared/settings";
import { debugLog, safely } from "../shared/diagnostics";
import { enhanceFileHeaders } from "./enhanceFileHeaders";
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
import {
  installPageTopShortcut,
  uninstallPageTopShortcut,
  updatePageTopShortcut,
} from "./pageTopShortcut";

let cachedSettings: Settings | null = null;
let goToTop: GoToTopController | null = null;

async function init(): Promise<void> {
  cachedSettings = await getSettings();
  debugLog("content script initialized", cachedSettings);

  applyAll();
  observeGitHubUpdates(() => safely("refresh enhancements", applyEnhancements));

  onSettingsChanged((next) => {
    cachedSettings = next;
    applyAll();
  });
}

function applyAll(): void {
  safely("apply enhancements", applyEnhancements);
  safely("apply back to top", applyGoToTop);
  safely("apply review flow", applyReviewFlow);
  safely("apply file tabs", applyFileTabs);
  safely("apply page top shortcut", applyPageTopShortcut);
}

function applyEnhancements(): void {
  if (!cachedSettings) {
    return;
  }
  enhanceFileHeaders({
    withLocateButton: cachedSettings.locateEnabled,
    withEditorButton: cachedSettings.editorEnabled,
  });
  if (cachedSettings.reviewFlowEnabled) {
    refreshReviewFlow();
  }
  if (cachedSettings.fileTabsEnabled) {
    refreshFileTabs();
  }
}

function applyGoToTop(): void {
  if (!cachedSettings) {
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

  if (goToTop) {
    goToTop.setBindings(bindings);
    return;
  }

  goToTop = installGoToTopButton(bindings);
}

function applyReviewFlow(): void {
  if (!cachedSettings) {
    return;
  }

  if (!cachedSettings.reviewFlowEnabled) {
    uninstallReviewFlowRail();
    return;
  }

  installReviewFlowRail();
  refreshReviewFlow();
}

function applyFileTabs(): void {
  if (!cachedSettings) {
    return;
  }

  if (!cachedSettings.fileTabsEnabled) {
    uninstallFileTabs();
    return;
  }

  installFileTabs();
  refreshFileTabs();
}

function applyPageTopShortcut(): void {
  if (!cachedSettings) {
    return;
  }

  if (!cachedSettings.pageTopShortcutEnabled) {
    uninstallPageTopShortcut();
    return;
  }

  installPageTopShortcut(cachedSettings.pageTopShortcut);
  updatePageTopShortcut(cachedSettings.pageTopShortcut);
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
