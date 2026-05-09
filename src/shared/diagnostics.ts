const DEBUG_STORAGE_KEY = "prFileExplorer.debug";
const LOG_PREFIX = "[PR File Explorer]";

export function debugLog(message: string, details?: unknown): void {
  if (!isDebugEnabled()) {
    return;
  }

  if (details === undefined) {
    console.debug(LOG_PREFIX, message);
    return;
  }

  console.debug(LOG_PREFIX, message, details);
}

export function reportFeatureError(feature: string, error: unknown): void {
  console.debug(`${LOG_PREFIX} ${feature} failed`, error);
}

export function safely(feature: string, action: () => void): void {
  try {
    action();
  } catch (error) {
    reportFeatureError(feature, error);
  }
}

function isDebugEnabled(): boolean {
  try {
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

