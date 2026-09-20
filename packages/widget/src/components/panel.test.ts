// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { buildPanel, createWrapper, resolvePanelGeometry } from "./panel";
import { mergeWithDefaults } from "../defaults";
import type { AgentWidgetConfig } from "../types";

describe("createWrapper: composer-bar mode", () => {
  it.each([{ v5Defaults: false }, { v5Defaults: true }])(
    "routes the transcript gap through the message token under v5Defaults=%s",
    (future) => {
      const { messagesWrapper } = buildPanel({ apiUrl: "/api", future } as AgentWidgetConfig);
      expect(messagesWrapper.style.gap).toBe("var(--persona-components-message-gap, 12px)");
    }
  );

  it("marks the wrapper with composer-bar data-attrs and leaves geometry to updateOpenState", () => {
    const config: AgentWidgetConfig = {
      apiUrl: "/api",
      launcher: { mountMode: "composer-bar" },
    };
    const { wrapper, panel } = createWrapper(config);

    expect(wrapper.getAttribute("data-persona-composer-bar")).toBe("");
    expect(wrapper.dataset.state).toBe("collapsed");
    // Default expandedSize is now "anchored" (was "fullscreen").
    expect(wrapper.dataset.expandedSize).toBe("anchored");
    expect(wrapper.classList.contains("persona-fixed")).toBe(true);

    // Geometry is owned entirely by applyComposerBarGeometry() in ui.ts so
    // collapsed → expanded transitions can clear stale inline styles.
    // createWrapper must not set any positioning/sizing inline.
    expect(wrapper.style.left).toBe("");
    expect(wrapper.style.transform).toBe("");
    expect(wrapper.style.bottom).toBe("");
    expect(wrapper.style.top).toBe("");
    expect(wrapper.style.width).toBe("");
    expect(wrapper.style.maxWidth).toBe("");

    // The panel keeps width: 100% so it fills whatever width ui.ts assigns.
    expect(panel.style.width).toBe("100%");
  });

  it("honors composerBar.expandedSize override", () => {
    const config: AgentWidgetConfig = {
      apiUrl: "/api",
      launcher: {
        mountMode: "composer-bar",
        composerBar: { expandedSize: "modal" },
      },
    };
    const { wrapper } = createWrapper(config);

    expect(wrapper.dataset.expandedSize).toBe("modal");
  });

  it("applies launcher.zIndex to the composer-bar wrapper", () => {
    const config: AgentWidgetConfig = {
      apiUrl: "/api",
      launcher: { mountMode: "composer-bar", zIndex: 12345 },
    };
    const { wrapper } = createWrapper(config);
    expect(wrapper.style.zIndex).toBe("12345");
  });

  it("does not apply composer-bar markers in floating mode", () => {
    const { wrapper } = createWrapper({ apiUrl: "/api" });
    expect(wrapper.hasAttribute("data-persona-composer-bar")).toBe(false);
  });
});

describe.each([false, true])("resolvePanelGeometry (v5=%s)", (v5Defaults) => {
  it("uses panel token variables when no legacy width alias was supplied", () => {
    const config = mergeWithDefaults({ apiUrl: "/api", future: { v5Defaults } }) as AgentWidgetConfig;
    expect(resolvePanelGeometry(config)).toMatchObject({
      width: "var(--persona-components-panel-width)",
      maxWidth: "var(--persona-components-panel-maxWidth)",
      height: "max(200px, var(--persona-components-panel-height))",
      maxHeight: "var(--persona-components-panel-maxHeight)",
    });
  });

  it("keeps an explicit launcher width ahead of panel tokens", () => {
    const config = mergeWithDefaults({
      apiUrl: "/api",
      future: { v5Defaults },
      launcher: { width: "600px" },
      theme: { components: { panel: { width: "320px", maxWidth: "320px" } } },
    }) as AgentWidgetConfig;
    expect(resolvePanelGeometry(config)).toMatchObject({ width: "600px", maxWidth: "600px" });
  });

  it("applies heightOffset regardless of which width source wins", () => {
    const config = mergeWithDefaults({
      apiUrl: "/api",
      future: { v5Defaults },
      launcher: { width: "600px", heightOffset: 24 },
    }) as AgentWidgetConfig;
    expect(resolvePanelGeometry(config).height).toBe(
      "max(200px, calc(var(--persona-components-panel-height) - 24px))"
    );
  });
});
