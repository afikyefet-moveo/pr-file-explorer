import {
  FILE_TREE_ID,
  HIGHLIGHT_CLASS,
  HIGHLIGHT_DURATION_MS,
} from "../../shared/constants";
import { basename, normalizePath, type FilePath } from "../../shared/dom";

export function findFileTreeItem(filePath: FilePath): HTMLElement | null {
  const tree = document.querySelector<HTMLElement>(`#${FILE_TREE_ID}`);
  if (!tree || !filePath) {
    return null;
  }

  const items = Array.from(
    tree.querySelectorAll<HTMLElement>("[role='treeitem']")
  );
  const target = basename(filePath);

  return (
    items.find((item) => normalizePath(item.id) === filePath) ??
    items.find(
      (item) =>
        normalizePath(item.getAttribute("aria-label")) === target
    ) ??
    items.find((item) =>
      normalizePath(item.textContent).endsWith(target)
    ) ??
    null
  );
}

export function scrollItemIntoExplorerView(item: HTMLElement): void {
  const scroller = getFileTreeScroller();
  if (!scroller) {
    item.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    return;
  }

  const itemRect = item.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const currentTop = scroller.scrollTop;
  const itemTopInsideScroller = itemRect.top - scrollerRect.top + currentTop;
  const targetTop =
    itemTopInsideScroller - scroller.clientHeight / 2 + itemRect.height / 2;
  const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const nextTop = Math.min(Math.max(0, targetTop), maxTop);

  scroller.scrollTo({
    top: nextTop,
    behavior: "smooth",
  });
}

export function highlightTreeItem(item: HTMLElement): void {
  item.classList.remove(HIGHLIGHT_CLASS);
  // Force animation restart when the same item is clicked repeatedly.
  void item.offsetWidth;
  item.classList.add(HIGHLIGHT_CLASS);

  window.setTimeout(() => {
    item.classList.remove(HIGHLIGHT_CLASS);
  }, HIGHLIGHT_DURATION_MS);
}

function getFileTreeScroller(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(
      `#${FILE_TREE_ID} [class*='FileTreeScrollable']`
    ) ?? document.querySelector<HTMLElement>(`#${FILE_TREE_ID}`)
  );
}
