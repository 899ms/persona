import "@runtypelabs/persona/widget.css";
import "./v5-preview.css";
import { initAgentWidget, type AgentWidgetConfig, type AgentWidgetMessage } from "@runtypelabs/persona";
import { renderExamplesShell } from "./examples-nav";
import { createDemoEchoFetch } from "./demo-echo-fetch";
// Reuse the documented application-level hook; this is not a library default.
import { renderToolActivitySummary } from "../../../examples/ai-sdk-next/app/lib/tool-activity-summary";

renderExamplesShell();
const host = document.querySelector<HTMLElement>("#v5-host")!;
const select = (name: string) => document.querySelector<HTMLSelectElement>(`#v5-${name}`)!;
const status = document.querySelector<HTMLElement>("#v5-status")!;
const streamButton = document.querySelector<HTMLButtonElement>("#v5-stream")!;
let widget: ReturnType<typeof initAgentWidget>;
let timers: ReturnType<typeof setTimeout>[] = [];
let epoch = Date.now();
let serial = 0;
const order = new Map<string, number>();

function cancelStream() {
  timers.forEach(clearTimeout);
  timers = [];
  streamButton.disabled = false;
}
function configuration(): AgentWidgetConfig {
  const v5 = select("version").value === "v5";
  const detail = select("details").value;
  const variant = select("variant").value as "default" | "row" | "card";
  const activityStyle = variant === "default" ? {} : { variant };
  const grouping = select("group").value;
  const icons = select("icons").value as "default" | "always" | "active" | "never";
  const display: NonNullable<NonNullable<AgentWidgetConfig["features"]>["toolCallDisplay"]> = {
    ...activityStyle,
    ...(grouping === "separate" ? { grouped: false } : {}),
    ...(grouping === "descriptive" ? { grouped: true, groupedMode: "collapsible" } : {}),
    ...(detail === "auto" ? { variant: "row", autoExpand: true } : {}),
    ...(detail === "summary" ? { expandable: false, activePreview: false, grouped: false } : {}),
    ...(icons === "default" ? {} : { iconVisibility: icons }),
  };
  return {
    apiUrl: "/v5-local-demo",
    customFetch: createDemoEchoFetch({ reply: () => "This is a local preview reply. Try opening tool details, switching themes, or comparing V4 and V5. No message is sent to a model." }),
    future: { v5Defaults: v5 },
    colorScheme: select("theme").value as "light" | "dark",
    persistState: false,
    launcher: { enabled: false, fullHeight: true },
    ...(select("fade").value === "default" ? {} : { layout: { topFade: select("fade").value === "on" } }),
    ...(select("scene").value === "welcome" ? {
      welcome: { title: "What would you like to explore?" },
      suggestions: { starters: { behavior: "fill", items: ["Explore the new defaults", "Help me get started", "Plan a project"] } },
    } : { welcome: { variant: "none" }, suggestions: { starters: { items: [] } } }),
    features: {
      showToolCalls: true, showReasoning: true,
      toolCallDisplay: display,
      reasoningDisplay: { ...activityStyle, ...(icons === "default" ? {} : { iconVisibility: icons }) },
    },
    ...(grouping === "descriptive" ? { toolCall: { renderGroupedSummary: renderToolActivitySummary } } : {}),
  };
}
function reset() {
  cancelStream();
  widget?.destroy();
  host.replaceChildren();
  epoch = Date.now(); serial = 0; order.clear();
  const config = configuration();
  widget = initAgentWidget({ target: host, config });
  const { customFetch: _fetch, ...shown } = config;
  document.querySelector("#v5-config")!.textContent = JSON.stringify(shown, (_key, value) => typeof value === "function" ? "renderToolActivitySummary (example hook)" : value, 2);
  document.querySelector<HTMLElement>("#v5-hook-note")!.hidden = select("group").value !== "descriptive";
  document.querySelector("#v5-caption")!.textContent = `${select("version").value.toUpperCase()} ${select("theme").value} · ${select("scene").selectedOptions[0].textContent}`;
}
function inject(message: Partial<AgentWidgetMessage> & Pick<AgentWidgetMessage, "id">) {
  if (!order.has(message.id)) order.set(message.id, serial++);
  const sequence = order.get(message.id)!;
  widget.injectTestMessage({ type: "message", message: {
    role: "assistant", content: "", createdAt: new Date(epoch - 60000 + sequence * 100).toISOString(), sequence, ...message,
  } });
}
function tool(id: string, name: string, extra: Partial<NonNullable<AgentWidgetMessage["toolCall"]>> = {}) {
  inject({ id, variant: "tool", streaming: extra.status === "running", toolCall: { id, name, status: "complete", success: true, startedAt: epoch, durationMs: 1200, ...extra } });
}
function reasoning(running = false) {
  inject({ id: "reason", variant: "reasoning", streaming: running, reasoning: {
    id: "reason", status: running ? "streaming" : "complete", startedAt: epoch, durationMs: 6500,
    chunks: ["Checking the documentation.\nComparing the available options."],
  } });
}
function openDetails() {
  // Use the real disclosure controls so scroll behavior is exercised too.
  host.querySelector<HTMLButtonElement>('[data-persona-tool-group] > button[aria-expanded="false"]')?.click();
  host.querySelector<HTMLButtonElement>('[data-message-id="search"] > button[aria-expanded="false"]')?.click();
}
function loadScene() {
  reset();
  const scene = select("scene").value;
  if (scene === "welcome") {
    status.textContent = "Try a suggestion or type a message. Replies are simulated locally.";
    return;
  }
  if (scene !== "long") inject({ id: "user", role: "user", content: "Check the theme documentation and show me what you find." });
  if (scene === "long") {
    for (let i = 0; i < 8; i++) {
      inject({ id: `user-${i}`, role: "user", content: i ? "What should I consider next?" : "Help me plan a project." });
      inject({ id: `answer-${i}`, content: "Keep each step small and reviewable. Start with a clear goal, explore the options, and verify the result.\n\nScroll back to compare earlier steps. The composer remains available while you read." });
    }
  }
  if (scene === "activity" || scene === "long") reasoning();
  tool("search", "search_docs", { args: { query: "Persona theme configuration" }, result: "Found the theme guide and three examples covering colors, typography, and tool activity." });
  tool("read", "read_file", { args: { path: "docs/theme-guide.md" }, result: scene === "details" ? Array.from({ length: 18 }, (_, i) => `Section ${i + 1}: Explicit theme overrides are preserved. Compare both light and dark styles.`).join("\n") : "Read the relevant configuration examples." });
  if (scene === "details") {
    tool("command", "run_command", { args: { command: "pnpm typecheck" }, result: { success: true, errors: 0 } });
    tool("empty", "check_service_status", { result: "All services are operational. This tool has no request arguments." });
    openDetails();
  } else if (scene === "states") {
    tool("running", "run_command", { status: "running", chunks: ["Checking the project…"], durationMs: undefined });
    tool("failed", "check_service_status", { success: false, error: "The service did not respond. Try again later." });
  } else {
    inject({ id: "final", content: "The theme guide and examples are ready. You can override the activity tokens to match your application." });
  }
  status.textContent = scene === "states" ? "Sample running and failed states. Expand a call to inspect its output." : scene === "details" ? "The first tool is open. The service-status tool demonstrates a response without a request." : "Open a group, then a tool. Manual expansion preserves your reading position.";
}
function runStream() {
  reset();
  streamButton.disabled = true;
  status.textContent = "Streaming sample activity. Open details manually, or try auto-expand.";
  inject({ id: "user", role: "user", content: "Find the theme guide and read the configuration options." });
  reasoning(true);
  const later = (ms: number, action: () => void) => timers.push(setTimeout(action, ms));
  later(900, () => { reasoning(); tool("search", "search_docs", { status: "running", args: { query: "Persona themes" }, durationMs: undefined }); });
  later(1600, () => tool("search", "search_docs", { status: "running", args: { query: "Persona themes" }, chunks: ["Searching the documentation…"], durationMs: undefined }));
  later(2600, () => tool("search", "search_docs", { args: { query: "Persona themes" }, chunks: ["Searching the documentation…"], result: "Found the theme guide." }));
  later(2900, () => tool("read", "read_file", { status: "running", args: { path: "docs/theme-guide.md" }, chunks: ["Reading the guide…"], durationMs: undefined }));
  later(4100, () => { tool("read", "read_file", { args: { path: "docs/theme-guide.md" }, result: "The guide describes palette, typography, and layout tokens." }); inject({ id: "final", content: "The documentation is ready. Expand either tool to inspect the Request and Response." }); streamButton.disabled = false; status.textContent = "Stream complete. Reset the scene or change a setting to compare."; });
}
for (const control of document.querySelectorAll<HTMLSelectElement>(".v5-controls select")) control.addEventListener("change", loadScene);
streamButton.addEventListener("click", runStream);
document.querySelector("#v5-reset")!.addEventListener("click", loadScene);
window.addEventListener("pagehide", () => { cancelStream(); widget.destroy(); });
loadScene();
