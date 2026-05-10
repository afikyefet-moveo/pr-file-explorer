import {
  PR_NAV_DROPDOWN_CLASS,
  PR_NAV_MENU_BUTTON_CLASS,
  PR_NAV_MENU_CLASS,
  PR_NAV_MENU_LINK_CLASS,
} from "../../shared/constants";
import { createIconButton } from "../../shared/buttonFactory";
import { getIconSvg } from "../../shared/icons";
import { installTooltip } from "../../shared/tooltip";

let installed = false;
let root: HTMLElement | null = null;
let dropdown: HTMLElement | null = null;
let menuButton: HTMLButtonElement | null = null;
let documentPointerDown: ((event: PointerEvent) => void) | null = null;
let documentKeyDown: ((event: KeyboardEvent) => void) | null = null;

interface NavItem {
  href: string;
  label: string;
}

const MENU_TOOLTIP =
  "Open PR tabs — Conversation, Commits, Checks, Files changed, …";

export function installPrNavMenu(): void {
  if (installed) {
    return;
  }

  document.querySelector<HTMLElement>(`.${PR_NAV_MENU_CLASS}`)?.remove();

  root = document.createElement("div");
  root.className = PR_NAV_MENU_CLASS;

  dropdown = document.createElement("div");
  dropdown.className = PR_NAV_DROPDOWN_CLASS;
  dropdown.id = "pr-file-explorer-pr-nav-dropdown";
  dropdown.hidden = true;
  dropdown.setAttribute("role", "menu");

  menuButton = createIconButton({
    variant: "default",
    ariaLabel: "Open pull request tabs menu",
    title: MENU_TOOLTIP,
    extraClassName: PR_NAV_MENU_BUTTON_CLASS,
    innerHtml: getIconSvg("prNavMenu"),
    dataset: { expanded: "false" },
  });

  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-haspopup", "true");
  menuButton.setAttribute("aria-controls", dropdown.id);

  installTooltip(menuButton, MENU_TOOLTIP);

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleDropdown();
  });

  root.appendChild(menuButton);
  root.appendChild(dropdown);
  document.body.appendChild(root);

  documentPointerDown = (event: PointerEvent) => {
    if (!root || root.contains(event.target as Node)) {
      return;
    }
    closeDropdown();
  };
  documentKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeDropdown();
    }
  };
  document.addEventListener("pointerdown", documentPointerDown, true);
  document.addEventListener("keydown", documentKeyDown, true);

  installed = true;
  refreshPrNavMenu();
}

export function uninstallPrNavMenu(): void {
  if (documentPointerDown) {
    document.removeEventListener("pointerdown", documentPointerDown, true);
    documentPointerDown = null;
  }
  if (documentKeyDown) {
    document.removeEventListener("keydown", documentKeyDown, true);
    documentKeyDown = null;
  }

  root?.remove();
  root = null;
  dropdown = null;
  menuButton = null;
  installed = false;
}

export function refreshPrNavMenu(): void {
  if (!installed || !dropdown) {
    return;
  }

  rebuildDropdownLinks(dropdown);
}

function toggleDropdown(): void {
  if (!dropdown || !menuButton) {
    return;
  }
  const next = dropdown.hidden;
  if (next) {
    rebuildDropdownLinks(dropdown);
    dropdown.hidden = false;
    menuButton.dataset["expanded"] = "true";
    menuButton.setAttribute("aria-expanded", "true");
    queueMicrotask(() => {
      dropdown?.querySelector<HTMLElement>(`.${PR_NAV_MENU_LINK_CLASS}`)?.focus();
    });
    return;
  }
  closeDropdown();
}

function closeDropdown(): void {
  if (!dropdown || !menuButton) {
    return;
  }
  if (dropdown.hidden) {
    return;
  }
  dropdown.hidden = true;
  menuButton.dataset["expanded"] = "false";
  menuButton.setAttribute("aria-expanded", "false");
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
    { href: `${base}/checks`, label: "Checks" },
    { href: filesPath, label: "Files changed" },
  ];
}

const PR_TAB_NAV_SELECTOR = 'nav[aria-label="Pull request navigation tabs"]';

function scrapeNavItems(): NavItem[] {
  const base = getPullBasePath();
  if (!base) {
    return [];
  }

  const matchesPull = (pathname: string): boolean =>
    pathname === base || pathname.startsWith(`${base}/`);

  const navHostsPullLinks = (nav: HTMLElement): boolean =>
    [...nav.querySelectorAll<HTMLAnchorElement>("a[href]")].some((a) => {
      try {
        const url = new URL(a.href);
        return (
          url.origin === location.origin && matchesPull(url.pathname)
        );
      } catch {
        return false;
      }
    });

  const nav =
    [...document.querySelectorAll<HTMLElement>(PR_TAB_NAV_SELECTOR)].find(
      navHostsPullLinks
    ) ??
    [...document.querySelectorAll<HTMLElement>("nav.UnderlineNav")].find(
      navHostsPullLinks
    );

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

function rebuildDropdownLinks(container: HTMLElement): void {
  container.replaceChildren();

  for (const item of scrapeNavItems()) {
    const link = document.createElement("a");
    link.className = PR_NAV_MENU_LINK_CLASS;
    link.href = item.href;
    link.textContent = item.label;
    link.setAttribute("role", "menuitem");

    let itemPath = item.href;
    try {
      itemPath = new URL(item.href, location.origin).pathname;
    } catch {
      // keep raw href segment
    }
    if (isActiveNavPath(itemPath)) {
      link.dataset["active"] = "true";
      link.setAttribute("aria-current", "page");
    }

    link.addEventListener("click", () => {
      closeDropdown();
    });

    container.appendChild(link);
  }
}
