import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const sourceDir = path.dirname(new URL(import.meta.url).pathname);
const submissionRoot = path.resolve(sourceDir, "..");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const jobs = [
  {
    source: "assets/source-svg/icon.svg",
    output: "../assets/icon-16.png",
    width: 16,
    height: 16,
  },
  {
    source: "assets/source-svg/icon.svg",
    output: "../assets/icon-32.png",
    width: 32,
    height: 32,
  },
  {
    source: "assets/source-svg/icon.svg",
    output: "../assets/icon-48.png",
    width: 48,
    height: 48,
  },
  {
    source: "assets/source-svg/icon.svg",
    output: "../assets/icon-128.png",
    width: 128,
    height: 128,
  },
  {
    source: "assets/source-svg/icon.svg",
    output: "assets/icons/icon-16.png",
    width: 16,
    height: 16,
  },
  {
    source: "assets/source-svg/icon.svg",
    output: "assets/icons/icon-32.png",
    width: 32,
    height: 32,
  },
  {
    source: "assets/source-svg/icon.svg",
    output: "assets/icons/icon-48.png",
    width: 48,
    height: 48,
  },
  {
    source: "assets/source-svg/icon.svg",
    output: "assets/icons/icon-128.png",
    width: 128,
    height: 128,
  },
  {
    source: "assets/source-svg/01-file-explorer-locate.svg",
    output: "assets/screenshots/01-file-explorer-locate-1280x800.png",
    width: 1280,
    height: 800,
  },
  {
    source: "assets/source-svg/02-review-flow-rail.svg",
    output: "assets/screenshots/02-review-flow-rail-1280x800.png",
    width: 1280,
    height: 800,
  },
  {
    source: "assets/source-svg/03-file-tabs.svg",
    output: "assets/screenshots/03-file-tabs-1280x800.png",
    width: 1280,
    height: 800,
  },
  {
    source: "assets/source-svg/04-toolbar-popup.svg",
    output: "assets/screenshots/04-toolbar-popup-1280x800.png",
    width: 1280,
    height: 800,
  },
  {
    source: "assets/source-svg/05-editor-options.svg",
    output: "assets/screenshots/05-editor-options-1280x800.png",
    width: 1280,
    height: 800,
  },
  {
    source: "assets/source-svg/small-promo.svg",
    output: "assets/promotional/small-promo-440x280.png",
    width: 440,
    height: 280,
  },
  {
    source: "assets/source-svg/marquee-promo.svg",
    output: "assets/promotional/marquee-promo-1400x560.png",
    width: 1400,
    height: 560,
  },
];

for (let index = 0; index < jobs.length; index += 1) {
  await render(jobs[index], index);
}

console.log(`Rendered ${jobs.length} PNG files with Chrome.`);

async function render(job, index) {
  const source = path.join(submissionRoot, job.source);
  const output = path.join(submissionRoot, job.output);
  mkdirSync(path.dirname(output), { recursive: true });
  rmSync(output, { force: true });

  const profileDir = path.join(
    "/private/tmp",
    `prfe-chrome-render-${process.pid}-${index}`
  );
  mkdirSync(profileDir, { recursive: true });

  const child = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--default-background-color=00000000",
    "--force-device-scale-factor=1",
    `--user-data-dir=${profileDir}`,
    `--window-size=${job.width},${job.height}`,
    `--screenshot=${output}`,
    pathToFileUrl(source),
  ]);

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const rendered = await waitForFile(output, 10_000);
  if (rendered) {
    child.kill("SIGTERM");
    await settle(child, 2_000);
    return;
  }

  child.kill("SIGKILL");
  await settle(child, 1_000);
  throw new Error(`Chrome did not render ${job.output}.\n${stderr}`);
}

function pathToFileUrl(filePath) {
  return `file://${filePath.split(path.sep).map(encodeURIComponent).join("/")}`;
}

async function waitForFile(filePath, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(filePath) && statSync(filePath).size > 0) {
      await delay(250);
      return true;
    }
    await delay(100);
  }
  return false;
}

function settle(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
