# GitHub PR DOM Map

This map is based on the saved examples in the repository:

- `pr-body.html`
- `pr-file-explorer.html`
- `pr-code-view-panel.html`
- `pr-file-section-header.html`
- `pr-page-header-sticky.html`

## File Explorer

### Root

```css
#pr-file-tree
```

Observed in `pr-file-explorer.html`.

### Scroll Container

```css
#pr-file-tree [class*="FileTreeScrollable"]
```

Observed class:

```text
PullRequestFileTree-module__FileTreeScrollable__OW_Y2
```

The script should avoid depending on the full generated class. Prefer:

```js
document.querySelector("#pr-file-tree [class*='FileTreeScrollable']")
```

Fallback: `#pr-file-tree`.

### Tree Items

```css
#pr-file-tree [role="treeitem"]
```

Observed behavior:

- Folder items have `id` values equal to their path segment or folder path.
- File items often have `id` values equal to the repository-relative file path.
- Leaf file items often expose only the basename in `aria-label`.

Example:

```html
<li
  id="apps/dashboard/src/app/[locale]/(authenticated)/[company]/transport/tools/[id]/car-test-archive/page.tsx"
  role="treeitem"
  aria-label="page.tsx">
</li>
```

## Diff Content

### Diff List

```css
[data-testid="progressive-diffs-list"]
```

Observed in `pr-code-view-panel.html`.

### Diff Entry

```css
[data-testid="progressive-diffs-list"] [role="region"][id^="diff-"]
```

Observed attributes:

```html
<div
  role="region"
  id="diff-4cb432..."
  aria-labelledby="heading-_r_a5_">
</div>
```

## File Header

### Header Wrapper

```css
[class*="DiffFileHeader-module__diff-file-header"]
```

This generated class is less stable than roles and attributes, so the userscript should mostly discover headers from known path anchors and climb to the nearest header-like container.

### File Path Sources

Preferred:

```css
button[data-file-path]
```

Observed on the "Expand all lines" button:

```html
<button
  class="js-expand-all-difflines-button"
  data-file-path="apps/dashboard/src/app/[locale]/.../page.tsx">
</button>
```

Fallback:

```css
h3 code
```

Observed:

```html
<h3>
  <a href="#diff-...">
    <code>apps/dashboard/src/app/[locale]/.../page.tsx</code>
  </a>
</h3>
```

GitHub may render invisible Unicode directionality characters around path text, so extracted text must be normalized.

### Copy Filename Button

The copy button is followed by a tooltip:

```html
<span aria-label="Copy file name to clipboard">Copy file name to clipboard</span>
```

Reliable insertion strategy:

1. Find a tooltip whose text or `aria-label` is `Copy file name to clipboard`.
2. Use the tooltip `id`.
3. Find the button with `aria-labelledby` pointing to that id.
4. Insert the custom locate button after that button.
5. If that fails, insert after the path heading.

## Comment Markers

Inline comments are visible inside diff tables with:

```css
[data-testid="review-thread"]
```

This can support later comment-flow helpers, but it should not be part of P0.

## Selector Strategy

Prefer stable selectors in this order:

1. IDs that GitHub intentionally exposes, such as `#pr-file-tree`.
2. ARIA roles and labels, such as `[role="treeitem"]`.
3. Test IDs, such as `[data-testid="progressive-diffs-list"]`.
4. Semantic data attributes, such as `[data-file-path]`.
5. Generated CSS module classes only as broad contains-match fallbacks.

