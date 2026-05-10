import {
  PR_NAV_LINK_CLASS,
  PR_NAV_ROW_CLASS,
  STICKY_STACK_CLASS,
} from "../../shared/constants";
import {
  ensureStickyStack,
  maybeRemoveStickyStackIfEmpty,
  syncStickyStackTop,
} from "../stickyDiffChrome/stickyDiffChrome";

let installed = false;
let scrollListener: (() => void) | null = null;
let resizeListener: (() => void) | null = null;

interface NavItem {
  href: string;
  label: string;
}

export function installStickyPrNav(): void {
  if (installed) {
    return;
  }

  scrollListener = () => {
    syncStickyTopFromDom();
  };
  resizeListener = () => {
    syncStickyTopFromDom();
  };

  window.addEventListener("scroll", scrollListener, { passive: true });
  window.addEventListener("resize", resizeListener);
  installed = true;
  refreshStickyPrNav();
}

export function uninstallStickyPrNav(): void {
  document
    .querySelectorAll<HTMLElement>(`.${PR_NAV_ROW_CLASS}`)
    .forEach((row) => row.remove());
  maybeRemoveStickyStackIfEmpty();

  if (scrollListener) {
    window.removeEventListener("scroll", scrollListener);
    scrollListener = null;
  }
  if (resizeListener) {
    window.removeEventListener("resize", resizeListener);
    resizeListener = null;
  }

  installed = false;
}

export function refreshStickyPrNav(): void {
  if (!installed) {
    return;
  }

  const stack = ensureStickyStack();
  if (!stack) {
    document
      .querySelectorAll<HTMLElement>(`.${PR_NAV_ROW_CLASS}`)
      .forEach((row) => row.remove());
    maybeRemoveStickyStackIfEmpty();
    return;
  }

  const row = ensurePrNavRow(stack);
  rebuildPrNavLinks(row);
  syncStickyStackTop(stack);
}

function syncStickyTopFromDom(): void {
  if (!installed) {
    return;
  }

  const stack = document.querySelector<HTMLElement>(`.${STICKY_STACK_CLASS}`);
  if (stack) {
    syncStickyStackTop(stack);
  }
}

function ensurePrNavRow(stack: HTMLElement): HTMLElement {
  let row = stack.querySelector<HTMLElement>(`.${PR_NAV_ROW_CLASS}`);
  if (!row) {
    row = document.createElement("div");
    row.className = PR_NAV_ROW_CLASS;
    stack.insertBefore(row, stack.firstChild);
  } else if (row.parentElement === stack && stack.firstElementChild !== row) {
    stack.insertBefore(row, stack.firstChild);
  }

  return row;
}

function getPullBasePath(): string {
  const match = location.pathname.match(/^(\/[^/]+\/[^/]+\/pull\/\d+)/);
  return match?.[1] ?? "";
}

function normalizePathname(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed || "/";
}

function isActiveNavPath(itemPathname: string): boolean {
  const current = normalizePathname(location.pathname);
  const item = normalizePathname(itemPathname);
  if (current === item) {
    return true;
  }

  const base = getPullBasePath();
  if (!base) {
    return false;
  }

  const isFilesLike = (path: string): boolean =>
    path === `${base}/files` ||
    path === `${base}/changes` ||
    path.startsWith(`${base}/files/`) ||
    path.startsWith(`${base}/changes/`);

  return isFilesLike(current) && isFilesLike(item);
}

function fallbackNavItems(): NavItem[] {
  const base = getPullBasePath();
  if (!base) {
    return [];
  }

  const filesPath = location.pathname.includes("/changes")
    ? `${base}/changes`
    : `${base}/files`;

  return [
    { href: base, label: "Conversation" },
    { href: `${base}/commits`, label: "Commits" },
    { href: filesPath, label: "Files changed" },
  ];
}

function scrapeNavItems(): NavItem[] {
  const base = getPullBasePath();
  if (!base) {
    return [];
  }

  const matchesPull = (pathname: string): boolean =>
    pathname === base || pathname.startsWith(`${base}/`);

  const candidateNavs = [
    ...document.querySelectorAll<HTMLElement>("nav.UnderlineNav"),
  ].filter((nav) =>
    [...nav.querySelectorAll<HTMLAnchorElement>("a[href]")].some((a) => {
      try {
        const url = new URL(a.href);
        return (
          url.origin === location.origin && matchesPull(url.pathname)
        );
      } catch {
        return false;
      }
    })
  );

  const nav = candidateNavs[0];
  if (!nav) {
    return fallbackNavItems();
  }

  const items: NavItem[] = [];
  const seen = new Set<string>();

  for (const anchor of nav.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    try {
      const url = new URL(anchor.href);
      if (url.origin !== location.origin || !matchesPull(url.pathname)) {
        continue;
      }

      const pathKey = `${url.pathname}${url.search}`;
      if (seen.has(pathKey)) {
        continue;
      }
      seen.add(pathKey);

      const label = (anchor.textContent ?? "").trim().replace(/\s+/g, " ");
      if (!label) {
        continue;
      }

      items.push({
        href: `${url.pathname}${url.search}${url.hash}`,
        label,
      });
    } catch {
      continue;
    }
  }

  return items.length > 0 ? items : fallbackNavItems();
}

function rebuildPrNavLinks(row: HTMLElement): void {
  row.replaceChildren();

  for (const item of scrapeNavItems()) {
    const link = document.createElement("a");
    link.className = PR_NAV_LINK_CLASS;
    link.href = item.href;
    link.textContent = item.label;

    let itemPath = item.href;
    try {
      itemPath = new URL(item.href, location.origin).pathname;
    } catch {
      // keep raw href segment
    }
    if (isActiveNavPath(itemPath)) {
      link.dataset["active"] = "true";
    }

    row.appendChild(link);
  }
}
