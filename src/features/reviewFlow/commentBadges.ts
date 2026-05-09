import { COMMENT_BADGE_CLASS } from "../../shared/constants";
import type { FilePath } from "../../shared/dom";
import { installTooltip } from "../../shared/tooltip";
import { findFileTreeItem } from "../locate/locateFile";
import { getAllCommentTargets, getFilePathFromRegion } from "./reviewDom";

export function markFilesWithComments(): void {
  const commentedPaths = getCommentedFilePaths();
  document
    .querySelectorAll<HTMLElement>(`.${COMMENT_BADGE_CLASS}`)
    .forEach((badge) => {
      if (!commentedPaths.includes(badge.dataset["filePath"] as FilePath)) {
        badge.remove();
      }
    });

  for (const filePath of commentedPaths) {
    const treeItem = findFileTreeItem(filePath);
    if (!treeItem || treeItem.querySelector(`.${COMMENT_BADGE_CLASS}`)) {
      continue;
    }

    const textContainer =
      treeItem.querySelector<HTMLElement>("[class*='TreeViewItemContentText']") ??
      treeItem;
    const badge = document.createElement("span");
    badge.className = COMMENT_BADGE_CLASS;
    badge.dataset["filePath"] = filePath;
    badge.setAttribute("aria-label", "Has review comments");
    badge.title = "Has review comments";
    installTooltip(badge, "Has review comments");
    textContainer.appendChild(badge);
  }
}

export function clearCommentBadges(): void {
  document
    .querySelectorAll<HTMLElement>(`.${COMMENT_BADGE_CLASS}`)
    .forEach((badge) => badge.remove());
}

function getCommentedFilePaths(): FilePath[] {
  return getAllCommentTargets()
    .map((target) => getFilePathFromRegion(target.region))
    .filter((path): path is FilePath => Boolean(path))
    .filter((path, index, list) => list.indexOf(path) === index);
}

