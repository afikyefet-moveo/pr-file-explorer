# GitHub PR File Explorer Enhancer

Chrome extension (Manifest V3) that adds review helpers on GitHub pull requests on the **Files changed** view (`/pull/<n>/files` or `/pull/<n>/changes`).

## Run from source

**Requirements:** Node.js 18+ and a Chromium browser (Chrome, Edge, Brave, Arc, etc.).

1. Clone and install dependencies:

   ```bash
   git clone <repo-url> pr-file-explorer
   cd pr-file-explorer
   npm install
   ```

2. Build the extension into **`dist/`**:

   - **Daily development:** `npm run dev` — keeps watching and rebuilding `dist/`.
   - **One-shot:** `npm run build` — production bundle (runs `tsc` as well).

3. Load it in the browser:

   1. Open `chrome://extensions` (Edge: `edge://extensions`).
   2. Enable **Developer mode**.
   3. Click **Load unpacked**.
   4. Select this repo’s **`dist/`** folder (build output — not the repo root or `src/`).

4. After code or dependency changes: rebuild if needed, click **Reload** on the extension card, then reload the GitHub **Files changed** tab if the page looks stale.

Optional: pin the extension for quicker access to the popup. TypeScript-only check: `npm run typecheck`.

Troubleshooting, ZIP installs, and editor setup details: [INSTALL.md](INSTALL.md).

## Quick start

1. Open a PR on GitHub and go to **Files changed**.
2. Use the **extension popup** (toolbar icon) for most on/off switches and shortcuts.
3. Use **Extension options** (`chrome://extensions` → this extension → **Extension options**) for the **editor command** (Cursor / VS Code), repo root, and enabling that control on file headers.

---

## Features

Each item lists **where it lives** and **how you control it**.

### Pull request tabs menu

- **What:** Floating **menu** (bottom-right, icon with horizontal bars) opens links to Conversation, Commits, Checks, Files changed, and other PR tabs scraped from the page — so you can leave the diff without scrolling to GitHub’s header.
- **Where:** Files changed page only.
- **Settings:** Always on when the extension is active on that route (no popup toggle).

### File tabs

- **What:** A tab strip above the diff for fast switching between files (preview vs pinned tabs).
- **Where:** Above the diff list on Files changed.
- **Settings:** Popup → **File tabs**.  
- **Behavior:** Single-click a file header for an italic **preview** tab; double-click the header or tab, or use **pin**, to keep a **permanent** tab.

### Sync file tree

- **What:** While you scroll the diff, the matching entry in the left **file tree** stays highlighted (and the tree scrolls when needed) so you always see where you are in the PR.
- **Where:** Left sidebar tree + diff viewport.
- **Settings:** Popup → **Sync file tree** (off by default).

### Review flow rail

- **What:** Floating controls for comment-driven review: previous/next comment, next unviewed file, copy review context as Markdown, copy unresolved comments (e.g. for an AI agent). Optional **dots** on tree items that have visible review threads.
- **Where:** Floating strip on Files changed (when enabled).
- **Settings:** Popup → **Review flow rail**, plus individual switches for each rail button.

### File explorer locate

- **What:** Icon on each diff file header that scrolls the sidebar tree to that file and briefly highlights it.
- **Where:** File headers on Files changed.
- **Settings:** Popup → **File explorer locate**.

### Back to top button

- **What:** After you scroll down, a floating button appears to jump **Files top** or **Page top**.
- **Where:** Bottom area of the viewport (next to the PR tabs menu when both show).
- **Settings:** Popup → **Back to top button**, with separate targets for **Click** vs **Shift + click**, and **Swap click and shift-click**.

### Scroll-to-top shortcut

- **What:** Keyboard shortcut that scrolls smoothly to the **very top of the page** (same idea as “page top”, independent of the back-to-top button targets).
- **Where:** Global on Files changed while the tab is focused.
- **Settings:** Popup → **Scroll-to-top shortcut** and recorded combo (default **Shift+T**).

### Open in editor command

- **What:** Optional control on each file header copies a ready-to-paste terminal command (e.g. `cursor -g "/your/clone/path/file.ts:123"`) using your editor choice and **local repo root**.
- **Where:** File headers on Files changed.
- **Settings:** **Extension options** only — editor (`cursor` / `code`), repo root, enable/disable. First-time setup may prompt when you use the button; **Alt/Option-click** can reopen setup (see [INSTALL.md](INSTALL.md)).

---

## Repository notes

**Stack:** TypeScript, Vite, `@crxjs/vite-plugin`, Manifest V3; DOM enhancements on `github.com`; React + Tailwind for popup and options.

**Design docs:** [Requirements](docs/requirements.md), [DOM map](docs/dom-map.md), [Implementation plan](docs/implementation-plan.md).

**Legacy userscript:** `src/github-pr-file-explorer.user.js` — Tampermonkey-style alternative; the packaged extension is built from `src/` TypeScript.
