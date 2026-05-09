import { OBSERVER_DEBOUNCE_MS } from "../shared/constants";

export function observeGitHubUpdates(callback: () => void): MutationObserver {
  let timeoutId = 0;
  const observer = new MutationObserver(() => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(callback, OBSERVER_DEBOUNCE_MS);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}
