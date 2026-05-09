# GitHub PR File Explorer Enhancer Requirements

## Mission

Add a native-feeling utility layer to GitHub pull request "Files changed" pages that helps reviewers keep their place, jump between relevant files, and connect a visible diff back to the file explorer.

The first useful slice is: from any file diff header, click an icon and make the PR file explorer scroll to that file and briefly highlight it.

## Supported Page

- GitHub pull request files changed pages: `/owner/repo/pull/{number}/files`
- GitHub pull request changes pages using the newer route naming: `/owner/repo/pull/{number}/changes`

## Primary User

An engineer reviewing medium or large pull requests in GitHub's web UI, especially when the file explorer and the current diff are visually disconnected.

## P0: Locate File In Explorer

### User Story

As a reviewer, when I am looking at a file diff, I want to click an icon in that file's section header and have the file explorer scroll to the matching file and mark it briefly.

### Functional Requirements

1. Inject one icon button into each GitHub file diff header.
2. Place the button directly after GitHub's "Copy file name to clipboard" button when that button exists.
3. Use a native GitHub-looking invisible icon button style.
4. Detect the file path from the diff section.
5. Prefer `data-file-path` from GitHub's expand-all-lines button.
6. Fall back to the visible file path in the header `code` element.
7. Normalize invisible directional characters and extra whitespace from GitHub-rendered paths.
8. Find the matching file item in `#pr-file-tree`.
9. Prefer an exact `role="treeitem"` `id` match because GitHub file tree item IDs often equal the repository-relative path.
10. Fall back to matching the tree item's accessible label or visible text when exact ID lookup fails.
11. Scroll the file explorer container, not the whole page.
12. Prefer centering the matching file in the file explorer viewport.
13. If the file is near the top or bottom, scroll as much as possible without overshooting.
14. Briefly highlight the matching file item for about one second.
15. If the file cannot be found, give non-blocking feedback on the button and leave the page unchanged.

### Acceptance Criteria

```text
Given I am on a GitHub PR files changed page
And the file tree is visible
When I click the locate icon in a file header
Then the file tree scrolls to the matching file
And the matching file item receives a temporary highlight
And the main PR scroll position does not change unexpectedly
```

```text
Given the matching file is close to the top or bottom of the file tree
When I click the locate icon
Then the file tree scrolls as close to centered as the scroll bounds allow
And the item is visible
```

```text
Given GitHub dynamically renders more file diffs
When new file headers appear
Then each new header receives the locate icon once
```

## P1: Back To Top Button

### User Story

As a reviewer, I want a small native-feeling control that quickly returns me to the top of the PR files page.

### Functional Requirements

1. Add a fixed-position button that appears only after the user scrolls meaningfully below the PR files area.
2. Use restrained GitHub-like styling.
3. Do not cover file review, comment, or viewed controls.
4. Scroll smoothly to the top of the PR files/diff area by default.
5. Hide the button again near the top.
6. Support Shift-click for absolute page top.

### Acceptance Criteria

```text
Given I have scrolled down the files changed page
When I click the back-to-top button
Then the window scrolls smoothly back to the top of the PR files area
```

```text
Given I have scrolled down the files changed page
When I Shift-click the back-to-top button
Then the window scrolls smoothly back to the absolute page top
```

## P2: Open Or Copy Editor Command

### User Story

As a reviewer, I want to open or copy a command for the current file in Cursor or VS Code, ideally at the visible line.

### Functional Requirements

1. Add a terminal action for the current file header.
2. Support Cursor and VS Code command formats.
3. Allow a configured local repository root.
4. Generate command examples:

```bash
cursor -g /path/to/repo/apps/example/file.ts:123
code -g /path/to/repo/apps/example/file.ts:123
```

5. If no line is available, omit the line suffix.
6. If direct protocol open is blocked or unavailable, copy the command to clipboard.
7. Store the selected editor and repository root in local browser storage.
8. Allow reconfiguration without editing source code.

### Prototype Behavior

The current prototype copies commands to the clipboard. It stores:

```text
prFileExplorer.editor
prFileExplorer.repoRoot
```

Option-click the terminal icon to reconfigure. Direct editor launching is intentionally deferred because browser support depends on local protocol handlers and user setup.

### Known Edge Cases

- User does not have the repository locally.
- Local folder name differs from GitHub repository name.
- PR comes from a fork.
- File was deleted or renamed.
- Browser blocks custom protocol links.
- `cursor` or `code` CLI is not installed.
- The currently visible diff line may be a hunk header rather than a file line.

## P3: Working File Tabs

### User Story

As a reviewer, I want sticky tabs for recently viewed files so I can jump back and forth inside a large PR.

### Functional Requirements

1. Track files whose diff sections enter the viewport.
2. Maintain a short recently-viewed list.
3. Render tabs near the sticky diff header area.
4. Show the active visible file.
5. Clicking a tab scrolls to that file's diff.
6. Avoid layout conflicts with GitHub's sticky page and file headers.

## P3: Commenting Flow Helpers

Best-effort DOM helpers:

1. Jump to next unresolved review comment.
2. Mark files with comments in the file explorer.
3. Show whether the current file has unresolved threads.
4. Jump to the next unviewed file.
5. Copy review context: file path, selected lines, and PR URL.

### Prototype Behavior

- A compact floating review rail appears on PR files pages.
- The rail includes next comment, next unviewed file, and copy review context actions.
- Review context is copied as Markdown with file path, inferred line/range, PR URL, and selected text when present.
- Files with visible review threads receive a subtle dot in the file explorer.
- Current-file status shows no comments, comments, or unresolved only when the DOM exposes a confident resolve action.
- If unresolved state is uncertain, the feature treats the item as a comment rather than claiming unresolved.

## Non-Goals For The First Prototype

- Replacing GitHub's file tree.
- Persisting settings beyond simple local storage.
- Implementing direct local editor opening without user configuration.
- Supporting every GitHub DOM experiment on day one.
- Building a polished extension UI before the userscript behavior is proven.

## Core Risks

1. GitHub class names are generated and may change.
2. GitHub uses soft navigation and dynamic rendering.
3. The file tree can be collapsed or filtered.
4. File paths may include invisible Unicode directionality marks in rendered text.
5. Renames and deleted files may not map cleanly to a single tree item.
