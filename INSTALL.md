# Install And User Guide

This is the friendly, copy-paste version. If you've never built a Chrome extension before, follow this end-to-end and you'll be done in a few minutes.

## What you'll end up with

A Chrome extension that adds quality-of-life buttons to GitHub pull request "Files changed" pages: locate-in-file-tree, back-to-top, IDE-like file tabs, review navigation, and an optional Cursor/VS Code copy-command icon.

## Prerequisites

Install once on your machine:

1. **Node.js 18 or newer.** Easiest: download the LTS installer from [nodejs.org](https://nodejs.org). After installing, open Terminal and check:
   ```bash
   node -v
   npm -v
   ```
   You should see version numbers and no errors.
2. **Google Chrome** (or any Chromium browser: Edge, Brave, Arc, Cursor's browser tab, etc.).
3. **Git** if you plan to `git clone`. Otherwise you can download the repo as a ZIP from GitHub and skip Git.

## Step 1: Get the project

Pick one of these.

**Option A — Git (recommended):**

```bash
git clone <repo-url> pr-file-explorer
cd pr-file-explorer
```

**Option B — ZIP download:**

1. Open the repo on GitHub.
2. Click the green "Code" button → "Download ZIP".
3. Unzip it somewhere stable like `~/Projects/pr-file-explorer`. Do **not** keep it in `~/Downloads`; Chrome warns when extensions live in temporary folders.
4. Open Terminal and `cd` into that folder.

## Step 2: Install dependencies

From inside the project folder:

```bash
npm install
```

This reads `package.json` and downloads the build tools into `node_modules/`. It can take 30–90 seconds the first time. You'll see a final line like `added X packages`.

## Step 3: Build the extension

```bash
npm run build
```

This produces a `dist/` folder. That's the actual extension Chrome will load. You should see something like `built in 1.4s` at the end.

If you ever pull new changes from the repo, rerun this command to refresh `dist/`.

## Step 4: Load it into Chrome

1. Open a new tab and navigate to `chrome://extensions`.
2. Toggle **Developer mode** on (top-right corner of that page).
3. Click **Load unpacked** (top-left).
4. In the file picker, choose the `dist/` folder inside this project. **Not the project root, not the `src/` folder — `dist/`.**
5. The extension should now appear in the list with the project's icon.

## Step 5: Pin the toolbar icon

1. Click the puzzle-piece icon in Chrome's toolbar (top-right).
2. Find "GitHub PR File Explorer Enhancer".
3. Click the pin icon next to it so the extension's icon stays visible in the toolbar.

You're done. Open any PR's "Files changed" page (`/pull/<n>/files`) to see the helpers in action.

## Updating the extension later

When the code changes (you `git pull` or download a newer ZIP):

```bash
npm install   # only if package.json changed
npm run build
```

Then go back to `chrome://extensions` and click the small **reload** icon on the extension's card. No need to remove and re-add it.

## How to use it

### Toolbar popup

Click the extension icon in Chrome's toolbar (anywhere — no need to be on GitHub) to open the popup. Toggles available:

- **Locate file in explorer** — adds a target icon to each file header.
- **Back to top** — floating button that appears when you scroll down. You can independently choose what plain click and Shift-click do (jump to top of files area or top of page), and there's a "Swap" button to flip them.
- **File tabs** — IDE-like tab row above the diff. Single-click a file header to open it as an italic preview tab; double-click (or pin) to keep it.
- **Review flow** — small rail with "next comment", "next unviewed file", and "copy review context" actions. Files with comments get a subtle dot in the file tree.

Toggling anything in the popup applies live to any open PR tab.

### On a PR page (default behavior)

- **Locate icon** in each file header. Click it and the file tree on the left scrolls to that file with a brief highlight.
- **Back-to-top button** appears in the bottom-right after scrolling down. Click it to return; Shift-click for the opposite target.
- **File tabs** at the top of the diff area. Click a tab to jump to that file. The pin icon in each file header toggles whether the tab is permanent.
- **Review rail** with quick actions for comment-heavy reviews.
- **Terminal icon** next to the file name copies a `cursor -g /path/to/repo/file.ts:123` (or `code -g`) command to your clipboard. The first time you click it you'll be asked for your editor and the absolute path to your local clone of the repo. Option-click (Alt-click on Windows/Linux) the icon later to reconfigure.

### Editor command — fine-tuning

Open the options page if you want to adjust the editor command:

1. `chrome://extensions` → click **Details** on this extension → click **Extension options**.
2. Pick `cursor` or `code`, set your repo root (e.g. `~/Projects/your-repo`), and save.
3. The command is *copied* to your clipboard, not auto-executed. Paste it into a terminal to actually open the file.

You can also disable the terminal icon entirely from the options page if you don't use a CLI-launchable editor.

## Troubleshooting

**The "Load unpacked" dialog rejects the folder.**
You probably picked the project root or `src/`. The correct choice is the `dist/` folder created by `npm run build`. If `dist/` doesn't exist, the build hasn't run successfully — re-run `npm run build` and watch for errors.

**Nothing happens on a PR page.**
The content script only runs on URLs matching `https://github.com/*/*/pull/*/files*` and `/changes*`. Make sure you're on the "Files changed" tab, not the conversation page. If you just installed the extension while a PR tab was open, refresh that tab.

**The toolbar icon is missing.**
It's hidden in the puzzle-piece menu. Click that and pin it.

**The popup is blank, looks unstyled, or buttons don't react.**
Old build artifacts can cause this. Run `npm run build` again and reload the extension on `chrome://extensions`.

**I changed code but Chrome shows the old version.**
Two things to do, in order:
1. `npm run build`
2. Reload the extension in `chrome://extensions` (small circular arrow on the card).
Then refresh the GitHub tab.

**Settings I changed in the popup don't seem to apply.**
The content script reacts to settings changes immediately on already-open PR tabs. If a tab was opened before you installed the extension, refresh it once.

**`npm install` fails on a corporate machine.**
You're likely behind a proxy or a private registry. Set `npm config set registry https://registry.npmjs.org/` and rerun, or talk to whoever manages npm at your company.

**I want to remove the extension cleanly.**
On `chrome://extensions`, click **Remove** on the card. To also wipe stored settings, that removal is enough — settings live in the extension's own `chrome.storage.local`, which is destroyed with it.

## Optional: developer mode

If you want to actively change the code:

```bash
npm run dev
```

Vite watches `src/` and rebuilds `dist/` on every save. Most changes hot-reload; sometimes you'll still need to click reload on `chrome://extensions` and refresh the GitHub tab. The full setup details are in the main `README`.
