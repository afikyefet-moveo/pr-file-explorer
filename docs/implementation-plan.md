# Implementation Plan

## Phase 1: Userscript Prototype

Goal: prove the core behavior on a real GitHub PR page before investing in extension packaging.

Deliverables:

- `src/github-pr-file-explorer.user.js`
- `manifest.json`
- Locate icon injected into each file header.
- Path extraction from `data-file-path` or header `code`.
- File tree item lookup.
- File tree scroll-to-visible behavior.
- Temporary highlight.
- Editor command copy action.
- Back-to-top action.
- Mutation observer for GitHub dynamic rendering.

Manual test flow:

1. Install the userscript in Tampermonkey or run it from DevTools Snippets.
2. Open `https://github.com/{owner}/{repo}/pull/{number}/files` or `/changes`.
3. Open the file explorer/sidebar.
4. Click the locate icon in several file headers.
5. Test files near the top, middle, and bottom of the tree.
6. Filter the file tree and confirm missing-file feedback is non-destructive.

## Phase 2: First Quality Of Life Feature

Add a back-to-top button.

Why second: it is independent, easy to validate, and useful immediately.

Status: implemented in the first prototype. Default click goes to the top of the PR files area; Shift-click goes to the absolute page top.

## Phase 3: Editor Command

Add a copy/open-in-editor action.

Implementation shape:

- Store preferred editor in `localStorage`.
- Store optional local repository root in `localStorage`.
- Generate `cursor -g` or `code -g` command.
- Copy the command to clipboard.
- Later, try URL protocol opening behind a setting.

Status: command copy is implemented. Direct protocol opening is deferred.

## Phase 4: Extension Packaging

Once selectors and behavior feel stable:

- Add `manifest.json`.
- Move userscript logic into a content script.
- Add a small options page for editor and repo root settings.
- Keep permissions minimal: GitHub URL matches plus storage.

Status: implemented. The extension is now a TypeScript + Vite + `@crxjs/vite-plugin` MV3 build. Content script entry is `src/content/main.ts`, styles are injected via `src/styles/content.css`, and a small vanilla options page lives under `src/options/`. Storage moved from `localStorage` to `chrome.storage.local`. The legacy userscript at `src/github-pr-file-explorer.user.js` is kept for Tampermonkey users but is no longer the extension entry point.

The editor command feature is gated by a runtime setting (`prFileExplorer.editorEnabled`) and is **off by default**.

## Phase 5: Working File Tabs

Build only after P0/P1/P2 are reliable.

Implementation outline:

- Use `IntersectionObserver` to track visible diff sections.
- Keep an in-memory list of recently active file paths.
- Render a compact sticky tab row.
- Clicking a tab scrolls to the corresponding diff section.
