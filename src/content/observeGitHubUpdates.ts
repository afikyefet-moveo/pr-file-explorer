import { OBSERVER_DEBOUNCE_MS } from "../shared/constants";

export interface GitHubUpdateEvent {
  requiresFullSync: boolean;
  urlChanged: boolean;
  url: string;
  previousUrl: string | null;
}

type GitHubUpdateCallback = (event: GitHubUpdateEvent) => void;

export function observeGitHubUpdates(
  callback: GitHubUpdateCallback
): () => void {
  let timeoutId = 0;
  let lastUrl = location.href;
  let pendingFullSync = false;

  const notify = (): void => {
    const nextUrl = location.href;
    const previousUrl = lastUrl;
    const urlChanged = nextUrl !== previousUrl;
    const requiresFullSync = pendingFullSync;
    lastUrl = nextUrl;
    pendingFullSync = false;

    callback({
      requiresFullSync,
      urlChanged,
      url: nextUrl,
      previousUrl: urlChanged ? previousUrl : null,
    });
  };

  const scheduleNotify = (requiresFullSync = false): void => {
    pendingFullSync = pendingFullSync || requiresFullSync;
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(notify, OBSERVER_DEBOUNCE_MS);
  };

  const notifyWhenVisible = (): void => {
    if (document.visibilityState === "visible") {
      scheduleNotify(true);
    }
  };

  const observer = new MutationObserver(() => scheduleNotify());

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const scheduleFullSync = (): void => scheduleNotify(true);

  document.addEventListener("turbo:load", scheduleFullSync);
  document.addEventListener("turbo:render", scheduleFullSync);
  window.addEventListener("popstate", scheduleFullSync);
  window.addEventListener("hashchange", scheduleFullSync);
  window.addEventListener("pageshow", scheduleFullSync);
  window.addEventListener("focus", scheduleFullSync);
  document.addEventListener("visibilitychange", notifyWhenVisible);

  return () => {
    window.clearTimeout(timeoutId);
    observer.disconnect();
    document.removeEventListener("turbo:load", scheduleFullSync);
    document.removeEventListener("turbo:render", scheduleFullSync);
    window.removeEventListener("popstate", scheduleFullSync);
    window.removeEventListener("hashchange", scheduleFullSync);
    window.removeEventListener("pageshow", scheduleFullSync);
    window.removeEventListener("focus", scheduleFullSync);
    document.removeEventListener("visibilitychange", notifyWhenVisible);
  };
}
