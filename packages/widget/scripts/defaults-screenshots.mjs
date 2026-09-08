#!/usr/bin/env node
/**
 * Deterministic screenshot matrix for the 4.x -> 5 defaults rollout.
 *
 * Usage:
 *   node scripts/defaults-screenshots.mjs capture before /tmp/persona-phase1/before/dist
 *   node scripts/defaults-screenshots.mjs capture after dist
 *   node scripts/defaults-screenshots.mjs compare
 *
 * Captures only legacy defaults until `future.v5Defaults` exists.  The page
 * intentionally avoids suggestion chips because PR 1 has an approved
 * platform-font difference for those chips.
 */
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, stat, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const outputRoot = process.env.PERSONA_SCREENSHOT_OUTPUT ?? "/tmp/persona-phase1/screenshots";
const linuxChromium = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync(linuxChromium) ? linuxChromium : undefined);

const scenarios = [
  "floating-open",
  "floating-empty",
  "floating-closed",
  "inline",
  "docked",
  "fullscreen",
  "mobile",
  "tool",
  "tool-running",
  "reasoning",
  "approval",
];
const schemes = ["light", "dark"];

function usage() {
  console.error("Usage: defaults-screenshots.mjs capture <before|after> <dist-dir> | compare");
  process.exitCode = 2;
}

function html() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="/widget.css">
<style>
  * { animation: none !important; transition: none !important; caret-color: transparent !important; }
  html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
  body { background: #f8fafc; color: #111827; font-family: Arial, sans-serif; }
  body[data-scheme="dark"] { background: #111827; color: #f9fafb; }
  #host { width: 100%; height: 100%; min-height: 0; position: relative; }
  #host.inline { box-sizing: border-box; width: min(440px, calc(100vw - 48px)); height: min(700px, calc(100vh - 48px)); margin: 24px auto; border: 1px solid #e5e7eb; }
  #host.docked { height: 100%; }
</style></head><body><div id="host"></div><script src="/index.global.js"></script>
<script>
const query = new URLSearchParams(location.search);
const scenario = query.get('scenario');
const scheme = query.get('scheme');
document.body.dataset.scheme = scheme;
const host = document.querySelector('#host');
if (scenario === 'inline') host.className = 'inline';
if (scenario === 'docked') host.className = 'docked';
if (scenario === 'fullscreen') host.style.cssText = 'position:fixed;inset:0;width:100%;height:100%';
const launcher = { autoExpand: true, title: 'Persona', subtitle: 'Here to help' };
if (scenario === 'floating-closed') launcher.autoExpand = false;
if (scenario === 'inline' || scenario === 'fullscreen') { launcher.enabled = false; launcher.fullHeight = true; }
if (scenario === 'docked') { launcher.mountMode = 'docked'; launcher.autoExpand = true; launcher.dock = { side: 'right', width: '420px', reveal: 'overlay', animate: false }; }
const controller = AgentWidget.initAgentWidget({ target: host, config: {
  apiUrl: '/dispatch', colorScheme: scheme, launcher, persistState: false, suggestionChips: []
} });
const stamp = (message) => ({ ...message, createdAt: '2026-01-01T12:00:00.000Z', streaming: false });
function seedText() {
  controller.injectUserMessage({ content: 'Show me the current project status.' });
  controller.injectAssistantMessage({ content: 'The project is on track. I can help with the next step.' });
}
function seed(kind) {
  if (kind === 'floating-open' || kind === 'inline' || kind === 'docked' || kind === 'fullscreen' || kind === 'mobile') return seedText();
  if (kind === 'tool' || kind === 'tool-running') {
    const status = kind === 'tool-running' ? 'running' : 'complete';
    return controller.injectTestMessage({ type: 'message', message: stamp({ id: 'tool-1', role: 'assistant', content: '', variant: 'tool', toolCall: { id: 'tool-1', name: 'Search documentation', status, duration: 1200, chunks: ['Found the integration guide.'] } }) });
  }
  if (kind === 'reasoning') return controller.injectTestMessage({ type: 'message', message: stamp({ id: 'reasoning-1', role: 'assistant', content: '', variant: 'reasoning', reasoning: { id: 'reasoning-1', status: 'complete', durationMs: 2300, chunks: ['Reviewing the available options.'] } }) });
  if (kind === 'approval') return controller.injectTestMessage({ type: 'message', message: stamp({ id: 'approval-1', role: 'assistant', content: '', variant: 'approval', approval: { id: 'approval-1', status: 'pending', agentId: 'agent-1', executionId: 'execution-1', toolName: 'Write file', description: 'Write the generated file', parameters: { path: 'output.md' } } }) });
}
seed(scenario);
window.__personaScreenshotReady = true;
</script></body></html>`;
}

async function serve(dist) {
  const root = resolve(dist);
  return await new Promise((resolveServer, reject) => {
    const server = createServer(async (request, response) => {
      try {
        const pathname = new URL(request.url, "http://localhost").pathname;
        if (pathname === "/" || pathname === "/index.html") {
          response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
          response.end(html());
          return;
        }
        const file = resolve(root, `.${pathname}`);
        if (!file.startsWith(`${root}/`) || !existsSync(file) || (await stat(file)).isDirectory()) throw new Error("Not found");
        const contentType = pathname.endsWith(".js") ? "text/javascript" : pathname.endsWith(".css") ? "text/css" : "application/octet-stream";
        response.writeHead(200, { "content-type": contentType, "cache-control": "no-store" });
        response.end(await readFile(file));
      } catch {
        response.writeHead(404); response.end("Not found");
      }
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveServer(server));
  });
}

async function capture(label, dist) {
  if (!existsSync(join(dist, "index.global.js"))) throw new Error(`Missing widget distribution: ${dist}`);
  const target = join(outputRoot, label);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  const server = await serve(dist);
  const port = server.address().port;
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
  try {
    for (const scheme of schemes) for (const scenario of scenarios) {
      const mobile = scenario === "mobile";
      const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: scheme });
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error));
      await page.addInitScript(() => {
        const fixed = new Date("2026-01-01T12:00:00.000Z").valueOf();
        Date.now = () => fixed;
        performance.now = () => 0;
        Math.random = () => 0.5;
      });
      await page.goto(`http://127.0.0.1:${port}/?scenario=${scenario}&scheme=${scheme}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.__personaScreenshotReady === true);
      await page.waitForTimeout(700); // lazy approval chunk adoption / final DOM paint
      const expected = scenario === "floating-closed" ? ".persona-launcher-surface button" :
        scenario.startsWith("tool") ? ".persona-tool-bubble" :
        scenario === "reasoning" ? ".persona-reasoning-bubble" :
        scenario === "approval" ? "button:has-text('Allow')" :
        scenario === "floating-empty" ? ".persona-widget-header" :
        ".persona-message-row-assistant .persona-message-bubble";
      try {
        await page.waitForSelector(expected, { timeout: 5_000 });
      } catch (error) {
        throw new Error(`Scenario ${scheme}/${scenario} did not render ${expected}: ${await page.locator("[data-persona-root]").innerText()}\n${error}`);
      }
      if (pageErrors.length) throw pageErrors[0];
      await page.screenshot({ path: join(target, `${scheme}-${scenario}.png`), fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
  console.log(`Captured ${scenarios.length * schemes.length} screenshots in ${target}`);
}

async function pngs(directory) {
  return (await readdir(directory)).filter((name) => name.endsWith(".png")).sort();
}

async function compare() {
  const before = join(outputRoot, "before");
  const after = join(outputRoot, "after");
  if (!existsSync(before) || !existsSync(after)) throw new Error("Capture both before and after first.");
  const names = await pngs(before);
  const changed = [];
  for (const name of names) {
    const afterPath = join(after, name);
    if (!existsSync(afterPath) || !(await readFile(join(before, name))).equals(await readFile(afterPath))) changed.push(name);
  }
  console.log(`${names.length - changed.length}/${names.length} byte-identical screenshots`);
  if (changed.length) console.log(`Changed: ${changed.join(", ")}`);
  process.exitCode = changed.length ? 1 : 0;
}

const [command, ...args] = process.argv.slice(2);
if (command === "capture" && args.length === 2 && ["before", "after"].includes(args[0])) await capture(args[0], args[1]);
else if (command === "compare" && args.length === 0) await compare();
else usage();
