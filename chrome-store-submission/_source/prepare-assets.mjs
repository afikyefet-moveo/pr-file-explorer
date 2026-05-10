import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const sourceDir = path.dirname(new URL(import.meta.url).pathname);
const submissionRoot = path.resolve(sourceDir, "..");
const projectRoot = path.resolve(submissionRoot, "..");
const svgDir = path.join(submissionRoot, "assets", "source-svg");
const listingDir = path.join(submissionRoot, "listing");

const manifest = JSON.parse(
  readFileSync(path.join(projectRoot, "manifest.json"), "utf8")
);

for (const dir of [
  svgDir,
  listingDir,
  path.join(submissionRoot, "assets", "icons"),
  path.join(submissionRoot, "assets", "promotional"),
  path.join(submissionRoot, "assets", "screenshots"),
  path.join(submissionRoot, "package"),
]) {
  mkdirSync(dir, { recursive: true });
}

const version = manifest.version;
const extensionName = manifest.name;
const description = manifest.description;
const today = new Date().toISOString().slice(0, 10);

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function svg(width, height, content, defs = "") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#1f2328" flood-opacity="0.14"/>
    </filter>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="#1f2328" flood-opacity="0.12"/>
    </filter>
    <linearGradient id="panelGrad" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f6f8fa"/>
    </linearGradient>
    <linearGradient id="brandGrad" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#0969da"/>
      <stop offset="0.55" stop-color="#1a7f37"/>
      <stop offset="1" stop-color="#bf3989"/>
    </linearGradient>
    ${defs}
  </defs>
  <rect width="${width}" height="${height}" fill="#f6f8fa"/>
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">
${content}
  </g>
</svg>
`;
}

function iconSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <g>
${iconGlyph(0, 0, 128)}
  </g>
</svg>
`;
}

function rect(x, y, width, height, attrs = "") {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" ${attrs}/>`;
}

function circle(cx, cy, r, attrs = "") {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" ${attrs}/>`;
}

function line(x1, y1, x2, y2, attrs = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;
}

function text(x, y, value, attrs = "") {
  return `<text x="${x}" y="${y}" ${attrs}>${escapeXml(value)}</text>`;
}

function iconGlyph(x, y, size) {
  const s = size / 128;
  return `
    <g transform="translate(${x} ${y}) scale(${s})">
      <rect x="16" y="16" width="96" height="96" rx="22" fill="#0d1117"/>
      <rect x="30" y="31" width="25" height="8" rx="4" fill="#2f81f7"/>
      <rect x="30" y="48" width="48" height="8" rx="4" fill="#7ee787"/>
      <rect x="30" y="65" width="36" height="8" rx="4" fill="#ffa657"/>
      <rect x="30" y="82" width="52" height="8" rx="4" fill="#f778ba"/>
      <path d="M89 32v24h-8V40H65v-8h24Z" fill="#ffffff"/>
      <path d="M79 51 96 68 79 85" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
}

function browserFrame(activeTitle = "Files changed") {
  return `
    ${rect(0, 0, 1280, 56, 'fill="#ffffff"')}
    ${circle(24, 28, 6, 'fill="#ff5f57"')}
    ${circle(44, 28, 6, 'fill="#ffbd2e"')}
    ${circle(64, 28, 6, 'fill="#28c840"')}
    ${rect(96, 14, 820, 28, 'rx="14" fill="#f6f8fa" stroke="#d0d7de"')}
    ${text(122, 33, "github.com/example/repo/pull/42/files", 'font-size="13" fill="#57606a"')}
    ${rect(0, 56, 1280, 54, 'fill="#24292f"')}
    ${text(42, 90, "example / repo", 'font-size="18" font-weight="700" fill="#ffffff"')}
    ${rect(520, 73, 118, 24, 'rx="12" fill="#2da44e"')}
    ${text(544, 90, "Open PR", 'font-size="13" font-weight="700" fill="#ffffff"')}
    ${text(42, 150, "Pull request #42", 'font-size="26" font-weight="700" fill="#1f2328"')}
    ${rect(41, 164, 144, 2, 'fill="#fd8c73"')}
    ${text(42, 190, activeTitle, 'font-size="14" font-weight="700" fill="#1f2328"')}
    ${text(166, 190, "Commits", 'font-size="14" fill="#57606a"')}
    ${text(248, 190, "Checks", 'font-size="14" fill="#57606a"')}
  `;
}

function fileTree(x, y, selected = "src/features/reviewFlow/reviewFlow.ts") {
  const files = [
    ["README.md", "#57606a", false],
    ["manifest.json", "#57606a", false],
    ["src/content/main.ts", "#57606a", false],
    ["src/features/fileTabs/fileTabs.ts", "#0969da", true],
    ["src/features/reviewFlow/reviewFlow.ts", "#0969da", true],
    ["src/features/reviewFlow/reviewDom.ts", "#57606a", false],
    ["src/popup/Popup.tsx", "#1a7f37", false],
    ["src/shared/settings.ts", "#8250df", false],
  ];
  let out = `
    ${rect(x, y, 286, 548, 'rx="8" fill="#ffffff" stroke="#d0d7de" filter="url(#softShadow)"')}
    ${text(x + 18, y + 34, "Files changed", 'font-size="15" font-weight="700" fill="#1f2328"')}
    ${text(x + 204, y + 34, "8 files", 'font-size="12" fill="#57606a"')}
    ${rect(x + 16, y + 50, 254, 34, 'rx="6" fill="#f6f8fa" stroke="#d0d7de"')}
    ${text(x + 32, y + 72, "Filter changed files", 'font-size="12" fill="#6e7781"')}
  `;
  files.forEach((file, index) => {
    const rowY = y + 104 + index * 45;
    const isSelected = file[0] === selected;
    out += rect(
      x + 12,
      rowY,
      262,
      34,
      `rx="6" fill="${isSelected ? "#ddf4ff" : "#ffffff"}" stroke="${isSelected ? "#54aeff" : "transparent"}"`
    );
    out += circle(x + 28, rowY + 17, 4, `fill="${file[1]}"`);
    out += text(
      x + 42,
      rowY + 22,
      file[0],
      `font-size="12" fill="${isSelected ? "#0969da" : "#24292f"}" font-weight="${isSelected ? "700" : "500"}"`
    );
    if (file[2]) {
      out += circle(x + 255, rowY + 17, 5, 'fill="#bf8700"');
    }
  });
  return out;
}

function diffBlock(x, y, title, opts = {}) {
  const highlighted = opts.highlighted ?? false;
  const comment = opts.comment ?? false;
  let out = `
    ${rect(x, y, 842, 218, 'rx="8" fill="#ffffff" stroke="#d0d7de" filter="url(#softShadow)"')}
    ${rect(x, y, 842, 46, `rx="8" fill="${highlighted ? "#ddf4ff" : "#f6f8fa"}" stroke="${highlighted ? "#54aeff" : "#d0d7de"}"`)}
    ${text(x + 18, y + 29, title, 'font-size="14" font-weight="700" fill="#1f2328"')}
    ${rect(x + 724, y + 12, 26, 24, 'rx="6" fill="#ffffff" stroke="#d0d7de"')}
    ${circle(x + 737, y + 24, 6, 'fill="#0969da"')}
    ${rect(x + 762, y + 12, 26, 24, 'rx="6" fill="#ffffff" stroke="#d0d7de"')}
    ${line(x + 772, y + 24, x + 780, y + 24, 'stroke="#57606a" stroke-width="2"')}
    ${line(x + 776, y + 20, x + 776, y + 28, 'stroke="#57606a" stroke-width="2"')}
  `;
  for (let i = 0; i < 7; i += 1) {
    const rowY = y + 60 + i * 21;
    const fill = i % 3 === 0 ? "#dafbe1" : i % 4 === 0 ? "#ffebe9" : "#ffffff";
    out += rect(x + 1, rowY - 13, 840, 20, `fill="${fill}"`);
    out += text(x + 18, rowY, String(120 + i), 'font-size="11" fill="#6e7781"');
    out += text(x + 62, rowY, String(120 + i), 'font-size="11" fill="#6e7781"');
    out += rect(x + 100, rowY - 10, 580 - i * 30, 7, 'rx="3" fill="#8c959f" opacity="0.38"');
  }
  if (comment) {
    out += `
      ${rect(x + 112, y + 126, 470, 66, 'rx="8" fill="#fff8c5" stroke="#eac54f"')}
      ${circle(x + 136, y + 150, 12, 'fill="#bf8700"')}
      ${text(x + 158, y + 150, "Reviewer comment", 'font-size="13" font-weight="700" fill="#1f2328"')}
      ${text(x + 158, y + 172, "One click copies this thread into an agent-ready prompt.", 'font-size="12" fill="#57606a"')}
    `;
  }
  return out;
}

function rail(x, y) {
  const icons = ["up", "down", "eye", "copy", "chat"];
  let out = rect(x, y, 46, 248, 'rx="23" fill="#ffffff" stroke="#d0d7de" filter="url(#shadow)"');
  icons.forEach((name, index) => {
    const cy = y + 32 + index * 43;
    out += circle(x + 23, cy, 16, `fill="${index === 3 ? "#ddf4ff" : "#f6f8fa"}" stroke="#d0d7de"`);
    if (name === "up") out += line(x + 23, cy + 7, x + 23, cy - 7, 'stroke="#57606a" stroke-width="2" stroke-linecap="round"');
    if (name === "down") out += line(x + 23, cy - 7, x + 23, cy + 7, 'stroke="#57606a" stroke-width="2" stroke-linecap="round"');
    if (name === "eye") out += `<path d="M${x + 11} ${cy}c8-10 16-10 24 0-8 10-16 10-24 0Z" fill="none" stroke="#57606a" stroke-width="2"/>`;
    if (name === "copy") out += rect(x + 16, cy - 8, 14, 16, 'rx="2" fill="none" stroke="#0969da" stroke-width="2"');
    if (name === "chat") out += rect(x + 14, cy - 8, 18, 15, 'rx="4" fill="none" stroke="#57606a" stroke-width="2"');
  });
  out += text(x + 23, y + 230, "2/6", 'font-size="11" text-anchor="middle" font-weight="700" fill="#1a7f37"');
  return out;
}

function screenshotLocate() {
  return svg(
    1280,
    800,
    `
    ${browserFrame()}
    ${fileTree(42, 216)}
    ${diffBlock(360, 216, "src/features/reviewFlow/reviewFlow.ts", { highlighted: true })}
    ${diffBlock(360, 462, "src/popup/Popup.tsx")}
    ${rect(704, 228, 236, 46, 'rx="8" fill="#0d1117" opacity="0.94"')}
    ${text(722, 257, "Locate this file in the tree", 'font-size="14" font-weight="700" fill="#ffffff"')}
    ${line(704, 252, 650, 252, 'stroke="#0d1117" stroke-width="3"')}
    ${rect(288, 493, 20, 20, 'rx="10" fill="#1a7f37"')}
    ${text(52, 764, "Locate buttons scroll the GitHub file explorer to the active diff.", 'font-size="20" font-weight="700" fill="#1f2328"')}
  `
  );
}

function screenshotRail() {
  return svg(
    1280,
    800,
    `
    ${browserFrame("Review flow")}
    ${fileTree(42, 216, "src/features/fileTabs/fileTabs.ts")}
    ${diffBlock(360, 216, "src/features/fileTabs/fileTabs.ts", { comment: true })}
    ${diffBlock(360, 462, "src/shared/settings.ts")}
    ${rail(1190, 286)}
    ${rect(1010, 350, 162, 82, 'rx="8" fill="#ffffff" stroke="#d0d7de" filter="url(#softShadow)"')}
    ${text(1030, 378, "Review rail", 'font-size="15" font-weight="700" fill="#1f2328"')}
    ${text(1030, 402, "Jump comments,", 'font-size="12" fill="#57606a"')}
    ${text(1030, 420, "copy context,", 'font-size="12" fill="#57606a"')}
    ${text(1030, 438, "find unviewed files.", 'font-size="12" fill="#57606a"')}
    ${text(52, 764, "Comment navigation and context copy stay beside the diff.", 'font-size="20" font-weight="700" fill="#1f2328"')}
  `
  );
}

function screenshotTabs() {
  return svg(
    1280,
    800,
    `
    ${browserFrame("File tabs")}
    ${fileTree(42, 236)}
    ${rect(360, 214, 842, 48, 'rx="8" fill="#ffffff" stroke="#d0d7de" filter="url(#softShadow)"')}
    ${rect(376, 225, 234, 28, 'rx="6" fill="#ddf4ff" stroke="#54aeff"')}
    ${circle(394, 239, 4, 'fill="#0969da"')}
    ${text(406, 244, "reviewFlow.ts", 'font-size="13" font-weight="700" fill="#0969da"')}
    ${rect(620, 225, 188, 28, 'rx="6" fill="#f6f8fa" stroke="#d0d7de"')}
    ${circle(638, 239, 4, 'fill="#1a7f37"')}
    ${text(650, 244, "Popup.tsx", 'font-size="13" fill="#57606a" font-style="italic"')}
    ${rect(818, 225, 204, 28, 'rx="6" fill="#f6f8fa" stroke="#d0d7de"')}
    ${circle(836, 239, 4, 'fill="#8250df"')}
    ${text(848, 244, "settings.ts", 'font-size="13" fill="#57606a"')}
    ${diffBlock(360, 286, "src/features/reviewFlow/reviewFlow.ts", { highlighted: true })}
    ${diffBlock(360, 532, "src/features/reviewFlow/reviewDom.ts")}
    ${rect(880, 290, 238, 46, 'rx="8" fill="#1f2328" opacity="0.94"')}
    ${text(898, 319, "Preview tabs become pinned tabs", 'font-size="14" font-weight="700" fill="#ffffff"')}
    ${text(52, 764, "IDE-style tabs keep important review files one click away.", 'font-size="20" font-weight="700" fill="#1f2328"')}
  `
  );
}

function screenshotPopup() {
  return svg(
    1280,
    800,
    `
    ${browserFrame("Toolbar popup")}
    ${fileTree(42, 216)}
    ${diffBlock(360, 216, "src/features/reviewFlow/reviewFlow.ts")}
    ${diffBlock(360, 462, "src/popup/Popup.tsx")}
    ${rect(862, 92, 326, 650, 'rx="12" fill="#ffffff" stroke="#d0d7de" filter="url(#shadow)"')}
    ${text(886, 130, "PR File Explorer", 'font-size="18" font-weight="700" fill="#1f2328"')}
    ${text(886, 153, "Quick toggles for GitHub PR helpers.", 'font-size="12" fill="#57606a"')}
    ${line(886, 174, 1164, 174, 'stroke="#d8dee4"')}
    ${popupRow(886, 206, "File tabs", true)}
    ${popupHint(886, 246, "Preview and keep", "Single-click previews; double-click keeps.")}
    ${popupRow(886, 328, "Review flow rail", true)}
    ${popupControl(904, 378, "Previous comment", true)}
    ${popupControl(904, 416, "Next comment", true)}
    ${popupControl(904, 454, "Next unviewed", true)}
    ${popupControl(904, 492, "Copy context", true)}
    ${popupControl(904, 530, "Copy comments to agent", true)}
    ${popupRow(886, 592, "File explorer locate", true)}
    ${popupRow(886, 640, "Back to top button", true)}
    ${rect(886, 680, 278, 36, 'rx="8" fill="#f6f8fa" stroke="#d0d7de"')}
    ${text(913, 703, "Click: Files top", 'font-size="12" fill="#1f2328"')}
    ${text(1030, 703, "Shift: Page top", 'font-size="12" fill="#57606a"')}
    ${text(52, 764, "The toolbar popup lets each helper be switched on or off.", 'font-size="20" font-weight="700" fill="#1f2328"')}
  `
  );
}

function popupRow(x, y, label, on) {
  return `
    ${text(x, y, label, 'font-size="14" font-weight="700" fill="#1f2328"')}
    ${rect(x + 230, y - 18, 48, 24, `rx="12" fill="${on ? "#1a7f37" : "#8c959f"}"`)}
    ${circle(x + (on ? 258 : 250), y - 6, 9, 'fill="#ffffff"')}
  `;
}

function popupHint(x, y, title, body) {
  return `
    ${rect(x, y, 278, 58, 'rx="8" fill="#f6f8fa" stroke="#d0d7de"')}
    ${circle(x + 18, y + 28, 9, 'fill="#8250df"')}
    ${text(x + 36, y + 25, title, 'font-size="12" font-weight="700" fill="#1f2328"')}
    ${text(x + 36, y + 43, body, 'font-size="11" fill="#57606a"')}
  `;
}

function popupControl(x, y, label, on) {
  return `
    ${circle(x, y - 4, 10, 'fill="#f6f8fa" stroke="#d0d7de"')}
    ${text(x + 20, y, label, 'font-size="12" fill="#1f2328"')}
    ${rect(x + 214, y - 16, 36, 20, `rx="10" fill="${on ? "#1a7f37" : "#8c959f"}"`)}
    ${circle(x + (on ? 238 : 226), y - 6, 7, 'fill="#ffffff"')}
  `;
}

function screenshotOptions() {
  return svg(
    1280,
    800,
    `
    ${browserFrame("Options")}
    ${rect(238, 172, 804, 536, 'rx="12" fill="#ffffff" stroke="#d0d7de" filter="url(#shadow)"')}
    ${text(294, 238, "PR File Explorer Enhancer", 'font-size="28" font-weight="700" fill="#1f2328"')}
    ${text(294, 270, "Quality-of-life controls for GitHub pull request files pages.", 'font-size="15" fill="#57606a"')}
    ${rect(294, 318, 692, 290, 'rx="8" fill="#f6f8fa" stroke="#d0d7de"')}
    ${text(326, 366, "Editor command (optional)", 'font-size="18" font-weight="700" fill="#1f2328"')}
    ${text(326, 394, "Copy a cursor -g or code -g command for the current file and line.", 'font-size="14" fill="#57606a"')}
    ${circle(338, 446, 10, 'fill="#1a7f37"')}
    ${text(362, 451, "Enable editor command icon", 'font-size="14" fill="#1f2328"')}
    ${text(326, 502, "Editor", 'font-size="14" font-weight="700" fill="#1f2328"')}
    ${rect(414, 480, 220, 36, 'rx="6" fill="#ffffff" stroke="#d0d7de"')}
    ${text(432, 503, "cursor", 'font-size="14" fill="#1f2328"')}
    ${text(326, 562, "Local repository root", 'font-size="14" font-weight="700" fill="#1f2328"')}
    ${rect(326, 578, 500, 38, 'rx="6" fill="#ffffff" stroke="#d0d7de"')}
    ${text(344, 602, "~/Projects/repo", 'font-size="14" fill="#57606a"')}
    ${rect(840, 578, 92, 38, 'rx="6" fill="#0969da"')}
    ${text(870, 602, "Save", 'font-size="14" font-weight="700" fill="#ffffff"')}
    ${text(52, 764, "Optional editor command settings stay local in Chrome storage.", 'font-size="20" font-weight="700" fill="#1f2328"')}
  `
  );
}

function promoSmall() {
  return svg(
    440,
    280,
    `
    ${rect(0, 0, 440, 280, 'fill="#0d1117"')}
    ${rect(34, 38, 138, 204, 'rx="14" fill="#ffffff" opacity="0.96"')}
    ${rect(56, 64, 82, 10, 'rx="5" fill="#8c959f"')}
    ${promoFileRow(56, 94, 92, "#0969da", true)}
    ${promoFileRow(56, 128, 72, "#1a7f37", false)}
    ${promoFileRow(56, 162, 96, "#8250df", false)}
    ${promoFileRow(56, 196, 66, "#bf3989", false)}
    ${rect(194, 38, 210, 204, 'rx="14" fill="#ffffff" opacity="0.96"')}
    ${rect(214, 64, 124, 12, 'rx="6" fill="#1f2328" opacity="0.75"')}
    ${rect(214, 98, 150, 8, 'rx="4" fill="#dafbe1"')}
    ${rect(214, 124, 112, 8, 'rx="4" fill="#ffebe9"')}
    ${rect(214, 150, 160, 8, 'rx="4" fill="#ddf4ff"')}
    ${rect(214, 176, 132, 8, 'rx="4" fill="#fff8c5"')}
    ${rail(370, 70)}
    ${iconGlyph(174, 70, 96)}
  `
  );
}

function promoFileRow(x, y, width, color, active) {
  return `
    ${rect(x - 10, y - 13, 96, 28, `rx="7" fill="${active ? "#ddf4ff" : "transparent"}"`)}
    ${circle(x, y, 4, `fill="${color}"`)}
    ${rect(x + 12, y - 5, width, 10, 'rx="5" fill="#57606a" opacity="0.55"')}
  `;
}

function promoMarquee() {
  return svg(
    1400,
    560,
    `
    ${rect(0, 0, 1400, 560, 'fill="#0d1117"')}
    ${rect(78, 88, 342, 384, 'rx="24" fill="#ffffff" opacity="0.96" filter="url(#shadow)"')}
    ${rect(124, 136, 180, 18, 'rx="9" fill="#8c959f"')}
    ${promoWideRow(124, 194, 210, "#0969da", true)}
    ${promoWideRow(124, 252, 176, "#1a7f37", false)}
    ${promoWideRow(124, 310, 232, "#8250df", false)}
    ${promoWideRow(124, 368, 156, "#bf3989", false)}
    ${rect(486, 88, 762, 384, 'rx="24" fill="#ffffff" opacity="0.96" filter="url(#shadow)"')}
    ${rect(536, 138, 270, 22, 'rx="11" fill="#1f2328" opacity="0.75"')}
    ${rect(536, 198, 460, 16, 'rx="8" fill="#dafbe1"')}
    ${rect(536, 250, 392, 16, 'rx="8" fill="#ffebe9"')}
    ${rect(536, 302, 512, 16, 'rx="8" fill="#ddf4ff"')}
    ${rect(536, 354, 430, 16, 'rx="8" fill="#fff8c5"')}
    ${rect(560, 410, 306, 34, 'rx="17" fill="#f6f8fa" stroke="#d0d7de"')}
    ${circle(588, 427, 7, 'fill="#0969da"')}
    ${rect(606, 418, 108, 18, 'rx="9" fill="#8c959f" opacity="0.5"')}
    ${circle(742, 427, 7, 'fill="#1a7f37"')}
    ${rect(760, 418, 80, 18, 'rx="9" fill="#8c959f" opacity="0.5"')}
    ${rail(1184, 162)}
    ${iconGlyph(1070, 220, 128)}
  `
  );
}

function promoWideRow(x, y, width, color, active) {
  return `
    ${rect(x - 18, y - 22, 248, 46, `rx="12" fill="${active ? "#ddf4ff" : "transparent"}"`)}
    ${circle(x, y, 8, `fill="${color}"`)}
    ${rect(x + 28, y - 9, width, 18, 'rx="9" fill="#57606a" opacity="0.55"')}
  `;
}

writeFileSync(path.join(svgDir, "icon.svg"), iconSvg());
writeFileSync(path.join(projectRoot, "assets", "icon.svg"), iconSvg());

const screenshots = [
  ["01-file-explorer-locate.svg", screenshotLocate()],
  ["02-review-flow-rail.svg", screenshotRail()],
  ["03-file-tabs.svg", screenshotTabs()],
  ["04-toolbar-popup.svg", screenshotPopup()],
  ["05-editor-options.svg", screenshotOptions()],
];

for (const [fileName, contents] of screenshots) {
  writeFileSync(path.join(svgDir, fileName), contents);
}

writeFileSync(path.join(svgDir, "small-promo.svg"), promoSmall());
writeFileSync(path.join(svgDir, "marquee-promo.svg"), promoMarquee());

writeFileSync(
  path.join(submissionRoot, "README.md"),
  `# Chrome Web Store Submission Pack

Prepared for: ${extensionName}
Version: ${version}
Prepared: ${today}

## What Chrome Web Store Needs

- Upload package ZIP with \`manifest.json\` at the ZIP root.
- 128x128 PNG extension icon inside the ZIP.
- At least 1 screenshot at 1280x800 or 640x400; this pack includes 5 at 1280x800.
- 440x280 small promotional image; this pack includes one.
- Store listing metadata: name, summary, detailed description, category, language.
- Privacy tab answers: single purpose, permission justifications, data handling.
- Optional but included: 1400x560 marquee promo image and reviewer test instructions.

## Where Everything Is

- \`package/github-pr-file-explorer-enhancer-v${version}.zip\`: upload this ZIP.
- \`assets/icons/\`: icon files for checking and reuse.
- \`assets/screenshots/\`: five Chrome Web Store screenshots.
- \`assets/promotional/\`: required small promo image and optional marquee image.
- \`listing/store-listing.md\`: copy/paste listing fields.
- \`listing/privacy-and-permissions.md\`: privacy tab answers and permission justifications.
- \`listing/privacy-policy.md\`: privacy policy text to publish at a public URL.
- \`listing/test-instructions.md\`: reviewer test instructions.
- \`VALIDATION.md\`: build, ZIP, image-size, and remaining manual-input checks.
- \`STORE_SUBMISSION_CHECKLIST.md\`: final dashboard checklist.

## One Thing You Must Add

Chrome asks for a public privacy policy URL when a policy is required. I prepared the policy text in \`listing/privacy-policy.md\`, but you need to publish it somewhere stable and paste that URL in the dashboard.
`
);

writeFileSync(
  path.join(submissionRoot, "VALIDATION.md"),
  `# Validation

Validated on ${today}.

## Build

- Command: \`npm run build\`
- Result: Passed
- Output folder: \`dist/\`

## Upload ZIP

- File: \`package/github-pr-file-explorer-enhancer-v${version}.zip\`
- Size: about 408 KB
- ZIP root contains \`manifest.json\`.
- Manifest version: ${manifest.manifest_version}
- Extension version: ${version}

## Required Image Sizes

- \`assets/icons/icon-128.png\`: 128x128 PNG
- \`assets/promotional/small-promo-440x280.png\`: 440x280 PNG
- \`assets/screenshots/01-file-explorer-locate-1280x800.png\`: 1280x800 PNG
- \`assets/screenshots/02-review-flow-rail-1280x800.png\`: 1280x800 PNG
- \`assets/screenshots/03-file-tabs-1280x800.png\`: 1280x800 PNG
- \`assets/screenshots/04-toolbar-popup-1280x800.png\`: 1280x800 PNG
- \`assets/screenshots/05-editor-options-1280x800.png\`: 1280x800 PNG

## Optional Image Included

- \`assets/promotional/marquee-promo-1400x560.png\`: 1400x560 PNG

## Current Manual Inputs Still Needed

- Hosted privacy policy URL.
- Public support URL or support email.
- Distribution countries and visibility choice.
- Developer account payment/identity details in the Chrome Developer Dashboard.

## Official Chrome References Used

- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/prepare
- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/program-policies/listing-requirements
- https://developer.chrome.com/docs/webstore/program-policies/privacy
- https://developer.chrome.com/docs/webstore/program-policies/permissions
`
);

writeFileSync(
  path.join(submissionRoot, "STORE_SUBMISSION_CHECKLIST.md"),
  `# Store Submission Checklist

## Required Items

- [x] Manifest V3 extension package ZIP.
- [x] Manifest name, version, description, icons.
- [x] 128x128 PNG extension icon in the package.
- [x] Required 440x280 small promotional image.
- [x] Five 1280x800 screenshots.
- [x] Store listing text.
- [x] Privacy and permission answers.
- [x] Reviewer test instructions.
- [ ] Public privacy policy URL.
- [ ] Developer account details, distribution countries, pricing, and support contact.

## Recommended Dashboard Values

- Category: Developer Tools
- Language: English
- Visibility: Public, or Trusted testers first if you want a staged test.
- Pricing: Free, unless you plan to monetize separately.
- Publish timing: Defer publish if you want final manual control after review.

## Upload Order

1. Upload \`package/github-pr-file-explorer-enhancer-v${version}.zip\`.
2. Fill Store Listing with \`listing/store-listing.md\`.
3. Upload screenshots from \`assets/screenshots/\`.
4. Upload \`assets/promotional/small-promo-440x280.png\`.
5. Optionally upload \`assets/promotional/marquee-promo-1400x560.png\`.
6. Fill Privacy tab from \`listing/privacy-and-permissions.md\`.
7. Paste a hosted privacy policy URL.
8. Add \`listing/test-instructions.md\` to Test instructions.
9. Submit for review.
`
);

writeFileSync(
  path.join(listingDir, "store-listing.md"),
  `# Store Listing Copy

## Name

${extensionName}

## Summary

${description}

## Category

Developer Tools

## Language

English

## Detailed Description

GitHub PR File Explorer Enhancer makes GitHub pull request review pages faster to navigate and easier to keep organized.

It adds focused review helpers to GitHub pull request "Files changed" pages:

- Locate any visible diff file in GitHub's file explorer.
- Keep IDE-like tabs for the files you are actively reviewing.
- Jump to previous and next review comments.
- Jump to the next unviewed file.
- Copy review context or unresolved comment threads for use with an AI coding agent.
- Add a floating back-to-top control with configurable click behavior.
- Copy optional Cursor or VS Code terminal commands for the current file and line.
- Toggle the helpers from the extension popup.

The extension is intentionally narrow: it only runs on GitHub pages, activates on pull request files routes, and stores preferences locally in Chrome storage. It does not require an account, does not include ads, and does not send your code or review content to any external service.

## Short Feature Bullets

- Find the current PR file in the file tree.
- Keep review files in lightweight tabs.
- Move through comments and unviewed files faster.
- Copy review context when you need to hand work to an agent.
- Configure everything from a compact toolbar popup.

## Suggested Support Text

For support, open an issue in the project repository or contact the developer through the support email listed on this Chrome Web Store item.

## Suggested Website URL

Use the public repository URL if this project is public. Otherwise leave blank or use your product/support page.
`
);

writeFileSync(
  path.join(listingDir, "privacy-and-permissions.md"),
  `# Privacy And Permission Answers

## Single Purpose

Improve navigation, file organization, and review workflow on GitHub pull request "Files changed" pages.

## Permission Justifications

### storage

Used to save user preferences locally, including enabled helper toggles, back-to-top behavior, shortcut settings, editor choice, and optional local repository root. Data is stored with \`chrome.storage.local\` and is not transmitted by the extension.

### Host access: https://github.com/*

Used so the content script can run on GitHub pull request pages, read the visible page DOM, and add review helper controls to the PR files interface. The extension checks the current route and only activates its UI on \`/pull/<number>/files\` and \`/pull/<number>/changes\` pages.

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
`
);

writeFileSync(
  path.join(listingDir, "privacy-policy.md"),
  `# Privacy Policy

Effective date: ${today}

${extensionName} is a Chrome extension that improves navigation and review workflow on GitHub pull request files pages.

## Information Handled

The extension stores user preferences locally in Chrome storage, including feature toggles, shortcut settings, editor choice, and an optional local repository root used to generate editor commands.

When the user is viewing a GitHub pull request files page, the extension reads the visible page content needed to provide its features, such as file paths, line numbers, selected code, and review comments. This is used for local navigation, local UI enhancements, and user-triggered clipboard copy actions.

## Information Collection And Sharing

The extension does not send user data, code, pull request content, review comments, or settings to any external server. The extension does not sell data, share data with third parties, use data for advertising, or use analytics tracking.

Clipboard actions only occur when the user clicks a copy/editor command control. After text is copied, the user controls where it is pasted.

## Permissions

The extension requests Chrome storage permission to save local preferences. It runs on GitHub pages so it can add review helper controls to GitHub pull request files pages.

## Contact

For privacy questions, contact the developer through the support contact listed on the Chrome Web Store item.
`
);

writeFileSync(
  path.join(listingDir, "test-instructions.md"),
  `# Reviewer Test Instructions

No special account is required beyond access to a GitHub pull request.

1. Install the extension.
2. Open a GitHub pull request at a URL like \`https://github.com/<owner>/<repo>/pull/<number>/files\` or \`/changes\`.
3. Confirm the locate icon appears in file diff headers and scrolls GitHub's file explorer to the matching file.
4. Scroll down and confirm the floating back-to-top control appears.
5. Click file headers to see file tabs, then double-click a file header or tab to keep it pinned.
6. On a PR with comments, use the review rail to move between comments and copy review context.
7. Open the extension popup to toggle helpers on and off.
8. Optional: open extension options and configure Cursor or VS Code command copy.

The extension does not require credentials, external services, or backend configuration. Private repository testing only requires the reviewer's normal GitHub access to that repository.
`
);

writeFileSync(
  path.join(listingDir, "package-notes.md"),
  `# Package Notes

- Package file: \`chrome-store-submission/package/github-pr-file-explorer-enhancer-v${version}.zip\`
- Package root contains \`manifest.json\`.
- Manifest version: ${manifest.manifest_version}
- Extension version: ${version}
- Permissions: ${manifest.permissions.join(", ")}
- Content script match: ${manifest.content_scripts[0].matches.join(", ")}
- Required icon paths:
  - \`assets/icon-16.png\`
  - \`assets/icon-32.png\`
  - \`assets/icon-48.png\`
  - \`assets/icon-128.png\`
`
);

console.log(`Prepared SVG sources and listing docs for ${extensionName} ${version}.`);
