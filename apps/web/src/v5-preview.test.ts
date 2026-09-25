// @vitest-environment jsdom
import pageHtml from "../v5-preview.html?raw";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ init: vi.fn(), inject: vi.fn(), destroy: vi.fn() }));
vi.mock("@runtypelabs/persona", () => ({ initAgentWidget: mocks.init }));
vi.mock("./examples-nav", () => ({ renderExamplesShell: vi.fn() }));
vi.mock("./demo-echo-fetch", () => ({ createDemoEchoFetch: () => vi.fn() }));
async function start() {
  vi.resetModules();
  mocks.init.mockReturnValue({ injectTestMessage: mocks.inject, destroy: mocks.destroy });
  document.body.innerHTML = pageHtml;
  await import("./v5-preview");
}
function choose(id: string, value: string) {
  const select = document.querySelector<HTMLSelectElement>(`#v5-${id}`)!;
  select.value = value;
  select.dispatchEvent(new Event("change"));
}
afterEach(() => { window.dispatchEvent(new Event("pagehide")); vi.useRealTimers(); vi.clearAllMocks(); document.body.innerHTML = ""; });
describe("V5 preview", () => {
  it("starts on real V5 defaults with local replies and stable sample order", async () => {
    await start();
    const config = mocks.init.mock.calls[0][0].config;
    expect(config.future.v5Defaults).toBe(true);
    expect(config.customFetch).toBeTypeOf("function");
    expect(config.features.toolCallDisplay).toEqual({});
    expect(mocks.inject.mock.calls.map(([event]) => event.message.id)).toEqual(["user", "reason", "search", "read", "final"]);
  });
  it("compares V4 and opts into descriptive labels without changing the default", async () => {
    await start();
    choose("version", "v4");
    expect(mocks.init.mock.lastCall?.[0].config.future.v5Defaults).toBe(false);
    choose("group", "descriptive");
    expect(mocks.init.mock.lastCall?.[0].config.toolCall.renderGroupedSummary).toBeTypeOf("function");
  });
  it("cancels the sample stream when another scene is selected", async () => {
    vi.useFakeTimers();
    await start();
    document.querySelector<HTMLButtonElement>("#v5-stream")!.click();
    vi.advanceTimersByTime(1700);
    choose("scene", "welcome");
    const count = mocks.inject.mock.calls.length;
    vi.advanceTimersByTime(10000);
    expect(mocks.inject).toHaveBeenCalledTimes(count);
    expect(document.querySelector<HTMLButtonElement>("#v5-stream")!.disabled).toBe(false);
  });
});
