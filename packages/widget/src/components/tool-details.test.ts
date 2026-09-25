// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createToolBubble } from "./tool-bubble";
import { copyToolDetail } from "./tool-details";
import type { AgentWidgetConfig, AgentWidgetMessage } from "../types";

const message = (tool: Partial<NonNullable<AgentWidgetMessage["toolCall"]>> = {}): AgentWidgetMessage => ({
  id: "tool", role: "assistant", content: "", createdAt: "2026-01-01", variant: "tool",
  toolCall: { id: "call", name: "Search", status: "complete", ...tool },
});
const render = (tool: Partial<NonNullable<AgentWidgetMessage["toolCall"]>>, config: AgentWidgetConfig = {}) =>
  createToolBubble(message(tool), { future: { v5Defaults: true }, ...config }, new Set(["tool"]));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("V5 tool details", () => {
  it.each([undefined, null, "", "  ", {}, [], "{}", "[]", "null"].map(value => [value]))("omits empty request %j", args => {
    const bubble = render({ args, result: "Done" });
    expect(bubble.querySelector('[data-persona-tool-detail="request"]')).toBeNull();
    expect(bubble.querySelector('[data-persona-tool-detail="response"] pre')?.textContent).toBe("Done");
  });
  it.each([0, false, { count: 0 }])("keeps meaningful request %j", args => {
    expect(render({ args }).querySelector('[data-persona-tool-detail="request"]')).not.toBeNull();
  });
  it("shows chunks during streaming and replaces them with the final result", () => {
    const running = render({ status: "running", chunks: ["Found ", "one"], result: "stale" });
    expect(running.querySelector("pre")?.textContent).toBe("Found one");
    const done = render({ chunks: ["Found one"], result: { count: 1 } });
    expect(done.querySelectorAll('[data-persona-tool-detail="response"]')).toHaveLength(1);
    expect(done.querySelector("pre")?.textContent).toBe('{\n  "count": 1\n}');
    expect(done.querySelector(".persona-tool-detail-code")).not.toBeNull();
  });
  it("keeps errors and escapes output, with plain prose typography", () => {
    const bubble = render({ result: '<img src=x onerror="alert(1)">', success: false, error: "Denied" });
    expect(bubble.querySelector("img")).toBeNull();
    expect(bubble.querySelector(".persona-tool-detail-code")).toBeNull();
    expect(bubble.querySelector("[data-persona-tool-error]")?.textContent).toBe("Denied");
  });
  it("preserves V4 sections and explicit V5 styles", () => {
    const legacy = createToolBubble(message({ args: {}, chunks: ["progress"], result: "done" }));
    expect(legacy.textContent).toContain("Arguments");
    expect(legacy.textContent).toContain("Activity");
    expect(legacy.textContent).toContain("Result");
    expect(legacy.querySelector(".persona-tool-detail")).toBeNull();
    const custom = render({ result: "done" }, { toolCall: {
      codeBlockBackgroundColor: "red", codeBlockTextColor: "blue", codeBlockBorderColor: "green", labelTextColor: "purple",
    } });
    expect(custom.querySelector<HTMLElement>(".persona-tool-detail")?.style.backgroundColor).toBe("red");
    expect(custom.querySelector<HTMLElement>("pre")?.style.color).toBe("blue");
    expect(custom.querySelector<HTMLElement>(".persona-tool-detail-label")?.style.color).toBe("purple");
  });
  it("uses a flat surface instead of inheriting markdown code boxes", () => {
    const style = document.createElement("style");
    style.textContent = readFileSync("src/styles/widget.css", "utf8");
    document.head.appendChild(style);
    const bubble = render({ result: "Plain response" });
    document.body.appendChild(bubble);
    try {
      const pre = bubble.querySelector("pre")!;
      expect(getComputedStyle(pre).padding).toBe("0px");
      expect(["transparent", "rgba(0, 0, 0, 0)"]).toContain(getComputedStyle(pre).backgroundColor);
      expect(getComputedStyle(pre).fontSize).toBe("13px");
    } finally { bubble.remove(); style.remove(); }
  });
  it("copies all output, shows a check, and restores the copy icon", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const text = "Long output\n".repeat(50);
    const button = render({ result: text }).querySelector<HTMLButtonElement>(".persona-tool-detail-copy")!;
    await copyToolDetail(button);
    expect(writeText).toHaveBeenCalledWith(text);
    expect(button.dataset.copied).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Copied");
    vi.advanceTimersByTime(1800);
    expect(button.dataset.copied).toBeUndefined();
    expect(button.getAttribute("aria-label")).toBe("Copy response");
  });
  it("handles unavailable clipboard without claiming success", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {});
    const button = render({ result: "done" }).querySelector<HTMLButtonElement>("button[data-persona-copy-tool-detail]")!;
    await copyToolDetail(button);
    expect(button.getAttribute("aria-label")).toBe("Copy failed — try again");
    expect(button.dataset.copied).toBeUndefined();
  });
});
