import { FILE_TABS_BAR_CLASS, STICKY_STACK_CLASS } from "../../shared/constants";
import { getStickyHeaderOffset } from "../../shared/stickyHeader";

export const STICKY_STACK_TOP_PROPERTY = "--pr-file-explorer-sticky-top";

export interface StickyMountTarget {
  parent: HTMLElement;
  before: ChildNode | null;
}

export function getStickyMountTarget(): StickyMountTarget | null {
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

export function ensureStickyStack(): HTMLElement | null {
  const mount = getStickyMountTarget();
  if (!mount) {
    return null;
  }

  let stack = mount.parent.querySelector<HTMLElement>(
    `:scope > .${STICKY_STACK_CLASS}`
  );

  if (!stack) {
    stack = document.createElement("div");
    stack.className = STICKY_STACK_CLASS;
    mount.parent.insertBefore(stack, mount.before);
  } else if (stack.parentElement !== mount.parent) {
    mount.parent.insertBefore(stack, mount.before);
  } else if (
    mount.before &&
    mount.before !== stack &&
    stack.nextSibling !== mount.before
  ) {
    mount.parent.insertBefore(stack, mount.before);
  }

  return stack;
}

export function syncStickyStackTop(stack: HTMLElement): void {
  const stickyOffset = getStickyHeaderOffset();
  stack.style.setProperty(STICKY_STACK_TOP_PROPERTY, `${stickyOffset}px`);
}

export function getStickyStackFromChild(element: HTMLElement | null): HTMLElement | null {
  return element?.closest<HTMLElement>(`.${STICKY_STACK_CLASS}`) ?? null;
}

/** Height of extension-owned sticky rows below GitHub’s sticky header (file tabs bar only). */
export function getStickyChromeBelowHeaderHeight(): number {
  const stack = document.querySelector<HTMLElement>(`.${STICKY_STACK_CLASS}`);
  if (!stack?.isConnected) {
    return 0;
  }

  let total = 0;

  const tabs = stack.querySelector<HTMLElement>(`.${FILE_TABS_BAR_CLASS}`);
  if (tabs?.dataset["visible"] === "true") {
    const tabsHeight = tabs.getBoundingClientRect().height;
    if (tabsHeight > 0) {
      total += tabsHeight;
    }
  }

  return total;
}

export function maybeRemoveStickyStackIfEmpty(): void {
  const stack = document.querySelector<HTMLElement>(`.${STICKY_STACK_CLASS}`);
  if (!stack) {
    return;
  }

  const hasTabs = Boolean(
    stack.querySelector<HTMLElement>(`.${FILE_TABS_BAR_CLASS}`)
  );

  if (!hasTabs) {
    stack.remove();
  }
}

export function placeFileTabsBarInStack(stack: HTMLElement, bar: HTMLElement): void {
  stack.appendChild(bar);
}
