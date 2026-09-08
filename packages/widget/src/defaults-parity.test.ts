// @vitest-environment jsdom

/**
 * Locked 4.22.0 defaults contract. The fixture was captured before the v5
 * defaults work began and must not be regenerated as part of later changes.
 *
 * JSDOM does not perform browser layout or resolve inherited custom
 * properties. This test therefore records the DOM-facing computed declarations
 * it can reliably expose, alongside the resolved config and emitted token map.
 * The Playwright visual harness covers physical layout separately.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { mergeWithDefaults } from "./defaults";
import { createAgentExperience } from "./ui";
import { createTheme, themeToCssVariables } from "./utils/tokens";

const fixturePath = resolve(process.cwd(), "src/__fixtures__/defaults-parity.v4.json");
const stylesheetPath = resolve(process.cwd(), "src/styles/widget.css");

const styles = (element: Element | null) => {
  if (!element) throw new Error("Expected baseline element to be rendered");
  const computed = getComputedStyle(element);
  return Object.fromEntries(
    ["display", "position", "background-color", "color", "border-radius", "padding", "margin", "font-size", "line-height", "box-shadow", "width", "height"].map(
      (property) => [property, computed.getPropertyValue(property)]
    )
  );
};

const snapshot = () => {
  const stylesheet = document.createElement("style");
  stylesheet.textContent = readFileSync(stylesheetPath, "utf8");
  document.head.appendChild(stylesheet);
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const controller = createAgentExperience(mount, {
    apiUrl: "https://api.example.com/chat",
    launcher: { autoExpand: true },
    persistState: false,
  });
  controller.injectUserMessage({ content: "Baseline user message" });
  controller.injectAssistantMessage({ content: "Baseline assistant message" });
  controller.injectTestMessage({
    type: "message",
    message: {
      id: "baseline-tool",
      role: "assistant",
      content: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      sequence: 3,
      streaming: false,
      variant: "tool",
      toolCall: { id: "baseline-tool", name: "baseline_tool", status: "complete", chunks: ["done"] },
    },
  });

  const result = {
    themeCssVariables: themeToCssVariables(createTheme()),
    mergedDefaultConfig: mergeWithDefaults(),
    computedStyles: {
      header: styles(mount.querySelector(".persona-widget-header")),
      userBubble: styles(mount.querySelector(".persona-message-row-user .persona-message-bubble")),
      assistantBubble: styles(mount.querySelector(".persona-message-row-assistant .persona-message-bubble")),
      composer: styles(mount.querySelector("[data-persona-composer-form]")),
      launcher: styles(mount.querySelector(".persona-launcher-surface button")),
      toolBubble: styles(mount.querySelector(".persona-tool-bubble")),
    },
  };
  controller.destroy();
  mount.remove();
  stylesheet.remove();
  return result;
};

afterEach(() => document.body.replaceChildren());

describe("4.22.0 defaults parity", () => {
  it("matches the committed baseline", () => {
    // JSON is deliberately the fixture format: it makes omitted/undefined
    // config and token values deterministic across Node versions.
    const actual = JSON.parse(JSON.stringify(snapshot()));
    expect(actual).toEqual(JSON.parse(readFileSync(fixturePath, "utf8")));
  });
});
