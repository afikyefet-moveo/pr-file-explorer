# Privacy And Permission Answers

## Single Purpose

Improve navigation, file organization, and review workflow on GitHub pull request "Files changed" pages.

## Permission Justifications

### storage

Used to save user preferences locally, including enabled helper toggles, back-to-top behavior, shortcut settings, editor choice, and optional local repository root. Data is stored with `chrome.storage.local` and is not transmitted by the extension.

### Host access: https://github.com/*

Used so the content script can run on GitHub pull request pages, read the visible page DOM, and add review helper controls to the PR files interface. The extension checks the current route and only activates its UI on `/pull/<number>/files` and `/pull/<number>/changes` pages.

## Data Handling

- Collects user data: No, not for transmission or sale.
- Sells user data: No.
- Shares user data with third parties: No.
- Uses data for advertising: No.
- Uses remote code: No.
- Requires account sign-in: No.

## Local Data The Extension Handles

- Extension settings stored in Chrome local storage.
- Optional local repository root entered by the user for editor command generation.
- Visible GitHub PR file paths, line numbers, selected code, and review comments when needed for on-page navigation or user-triggered clipboard copy.

This data remains on the user's device unless the user explicitly copies text to the clipboard and pastes it elsewhere.

## Suggested Chrome Privacy Data Category Selection

If the dashboard asks whether the extension collects data, answer "No" if "collects" means transmitted off-device by the extension. If the dashboard asks about data handled locally, disclose website content/file paths as handled locally for the single purpose above.
