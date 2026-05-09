import {
  getSettings,
  onSettingsChanged,
  type Settings,
} from "../shared/settings";
import { enhanceFileHeaders } from "./enhanceFileHeaders";
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

let cachedSettings: Settings | null = null;
let goToTop: GoToTopController | null = null;

async function init(): Promise<void> {
  cachedSettings = await getSettings();

  applyAll();
  observeGitHubUpdates(applyEnhancements);

  onSettingsChanged((next) => {
    cachedSettings = next;
    applyAll();
  });
}

function applyAll(): void {
  applyEnhancements();
  applyGoToTop();
  applyReviewFlow();
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
