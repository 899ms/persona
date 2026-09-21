// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentExperience } from "./ui";
import { mount as mountCritical } from "./launcher-global";
import { getActiveTheme, themeToCssVariables } from "./utils/theme";
import type { AgentWidgetConfig } from "./types";

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe.each([false, true])("launcher variants (v5=%s)", (v5Defaults) => {
  it.each([undefined, "pill", "circle"] as const)("matches deferred and full rendering for %s", (variant) => {
    window.scrollTo = vi.fn();
    const config: AgentWidgetConfig = {
      apiUrl: "/dispatch", persistState: false, future: { v5Defaults },
      launcher: { ...(variant ? { variant } : {}), title: "Open support", teaser: { text: "Need help?" } },
    };
    const host = document.body.appendChild(document.createElement("div"));
    const target = document.body.appendChild(document.createElement("div"));
    const full = createAgentExperience(host, config);
    const critical = mountCritical({ target, config, onOpen: vi.fn() });
    const button = host.querySelector<HTMLButtonElement>(".persona-launcher-surface > button")!;
    try {
      const circle = variant ? variant === "circle" : v5Defaults;
      expect(button.dataset.personaLauncherVariant).toBe(circle ? "circle" : undefined);
      expect(button.innerHTML).toBe(critical.element.innerHTML);
      expect(button.getAttribute("style")).toBe(critical.element.getAttribute("style"));
      expect(host.style.getPropertyValue("--persona-launcher-bg"))
        .toBe(critical.root.style.getPropertyValue("--persona-launcher-bg"));
      if (circle) expect(button.getAttribute("aria-label")).toBe("Open support");
      full.update({ launcher: { variant: circle ? "pill" : "circle" } });
      critical.update({ ...config, launcher: { ...config.launcher, variant: circle ? "pill" : "circle" } });
      expect(button.dataset.personaLauncherVariant).toBe(circle ? undefined : "circle");
      expect(button.innerHTML).toBe(critical.element.innerHTML);
    } finally { full.destroy(); critical.destroy(); }
  });

  it.each(["light", "dark"] as const)("resolves circle geometry and explicit tokens in %s", colorScheme => {
    const config: AgentWidgetConfig = { future: { v5Defaults }, colorScheme, launcher: { variant: "circle" } };
    const css = themeToCssVariables(getActiveTheme(config));
    expect(css["--persona-components-launcher-size"]).toBe("48px");
    expect(css["--persona-components-launcher-offset"]).toBe("20px");
    expect(css["--persona-launcher-shadow"]).toBe("0 8px 24px rgba(0,0,0,.16)");
    expect(css["--persona-launcher-bg"]).not.toBe(css["--persona-launcher-fg"]);
    const custom = themeToCssVariables(getActiveTheme({ ...config, theme: { components: { launcher: {
      size: "56px", iconSize: "20px", offset: "32px", background: "#123456", foreground: "#ffffff", shadow: "none",
    } } } }));
    expect(custom["--persona-components-launcher-size"]).toBe("56px");
    expect(custom["--persona-components-launcher-offset"]).toBe("32px");
    expect(custom["--persona-launcher-bg"]).toBe("#123456");
    expect(custom["--persona-launcher-shadow"]).toBe("none");
  });
});
