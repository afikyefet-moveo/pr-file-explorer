# GitHub PR File Explorer Enhancer

**What this repo is:** A Manifest V3 Chrome extension that improves GitHub **pull request** review on the **Files changed** tab — the URL shape `https://github.com/<owner>/<repo>/pull/<n>/files`. It injects controls into that page (locate a file in the sidebar tree, IDE-style file tabs, a compact review/navigation rail, back-to-top, optional Cursor/VS Code copy-commands, and more).

**Who it’s for:**

- **Developers cloning this repo** — build from source and load **unpacked** from `dist/` while you work.
- **Reviewers using a built copy** — install once, then use GitHub as usual with the extra UI.

---

## Development setup (Chrome, Load unpacked)

You need **Node.js 18+** and a Chromium browser (Chrome, Edge, Brave, Arc, etc.).

```bash
git clone <repo-url> pr-file-explorer
cd pr-file-explorer
npm install
```

Generate the extension bundle:

| Command | When to use |
| --- | --- |
| `npm run dev` | Daily development: Vite watches files and writes to **`dist/`**. Keep it running. |
| `npm run build` | One-shot production build into **`dist/`** (also runs `tsc`). |

**Load unpacked (once per machine / clone):**

1. Open **`chrome://extensions`** (Edge: `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Choose this repository’s **`dist/`** folder — the **build output**, not the repo root and not `src/`.

**While developing:**

1. After each rebuild, click **Reload** on the extension card in `chrome://extensions` when something doesn’t update (manifest, popup, options, service worker, or stubborn content-script changes).
2. Hard-refresh or reload the GitHub **Files changed** tab if the page still shows old behavior.

**After `git pull`:** run `npm install` if dependencies changed, rebuild (`dev` or `build`), then **Reload** the extension.

Optional: pin **GitHub PR File Explorer Enhancer** from the extensions puzzle menu so the popup is one click away.

Other scripts: `npm run typecheck` — TypeScript check only.

More detail for ZIP installs and troubleshooting: [INSTALL.md](INSTALL.md).

---

## Using the extension (reviewers)

1. Open any PR on GitHub and switch to **Files changed**.
2. Leave the **file tree** open on the left if you want **locate in explorer** to scroll and highlight the current file.
3. Click the **extension icon** in the toolbar to turn features on or off and configure back-to-top clicks.
4. For editor copy-commands: **Extension options** — from `chrome://extensions` → this extension → **Extension options** — set editor (`cursor` / `code`), enable/disable the control, and your **local repo root**.

The first time you use the **terminal-style button** on a file header (copy open-in-editor command), you’ll be prompted for editor and repo path. You can reopen that flow from the options page or with **Alt/Option-click** on that button (see [INSTALL.md](INSTALL.md)).

---

## Features (what each part does)

### Toolbar popup

Central switchboard while browsing GitHub (click the extension icon):

- **Locate file in explorer** — Adds an icon on each diff file header. Click it to scroll the PR file tree to that file and briefly highlight it so you don’t lose your place on huge PRs.
- **IDE-like file tabs** — Adds a tab strip above the diff so you can treat files like editor tabs: quick switching without hunting the tree.
- **Review-flow rail** — A compact strip of actions for comment-driven review (see below). You can turn the whole rail off or hide individual buttons.
- **Floating back-to-top** — After you scroll down, a button appears to jump back up. You choose separately what a normal click vs **Shift+click** does: **top of the Files region** vs **top of the whole page**, and you can swap those two behaviors in one click.
- **Comment dots** — When the review rail is relevant, optional subtle dots in the file tree mark files that have visible review threads.

### On the Files changed page

- **Locate** — Syncs the sidebar tree with the file you’re reading; useful when GitHub virtualizes or paginates long diffs.
- **Back to top** — Uses your popup settings so single-click and Shift+click match how you like to move (files-first vs whole-page).
- **File tabs** — **Single-click** a file header opens an italic **preview** tab (replaced when you preview another file). **Double-click** the header or tab, or use the **pin** control, to make a **permanent** tab. Click tabs to jump between files; closing a tab updates header pin state.
- **Review rail** — Typical actions: previous/next **review comment**, jump to **next unviewed** file, **copy review context** as Markdown, **copy unresolved comments** (e.g. for an AI agent). Shows **comment status** for the file you’re in.
- **Comment dots** — At-a-glance which paths still have visible threads.

### Extension options page

- **Editor command** — Optional control on each header copies a line-ready command such as `cursor -g "/your/clone/path/file.ts:123"` using your chosen editor and **repo root** so paths resolve correctly on your machine.

---

## Repo internals (optional)

**Stack:** TypeScript, Vite, `@crxjs/vite-plugin`, Manifest V3; vanilla DOM on `github.com`; React + Tailwind for popup and options.

**Design docs:** [Requirements](docs/requirements.md), [DOM map](docs/dom-map.md), [Implementation plan](docs/implementation-plan.md).

**Legacy userscript:** `src/github-pr-file-explorer.user.js` still exists for Tampermonkey/DevTools-style use; the shipped extension is built from the TypeScript under `src/`.
