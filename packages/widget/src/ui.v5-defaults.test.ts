// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentExperience } from "./ui";

const controllers: ReturnType<typeof createAgentExperience>[] = [];
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe.each([false, true])("core defaults lifecycle (v5=%s)", (v5Defaults) => {
  it("applies a live defaults switch to existing messages and header", () => {
    window.scrollTo = vi.fn();
    const mount = document.createElement("div");
    document.body.append(mount);
    const controller = createAgentExperience(mount, {
      apiUrl: "/dispatch", persistState: false,
      future: { v5Defaults }, launcher: { autoExpand: true },
    });
    controllers.push(controller);
    controller.injectUserMessage({ content: "Hello" });
    controller.injectAssistantMessage({ content: "Welcome" });
    const assertState = (v5: boolean) => {
      expect(mount.dataset.personaDefaults).toBe(v5 ? "v5" : "v4");
      const header = mount.querySelector<HTMLElement>(".persona-widget-header")!;
      expect((header.firstElementChild as HTMLElement).style.width).toBe(v5 ? "20px" : "40px");
      expect(mount.style.getPropertyValue("--persona-components-header-padding"))
        .toBe(v5 ? "8px 8px 8px 16px" : "20px 24px");
      const bubble = mount.querySelector<HTMLElement>(".persona-message-row-assistant .persona-message-bubble")!;
      expect(bubble.style.lineHeight).toBe(v5 ? "var(--persona-message-assistant-line-height, 1.75)" : "");
      const status = mount.querySelector<HTMLElement>("[data-persona-composer-status]")!;
      expect(status.style.display).toBe(v5 ? "none" : "");
    };
    assertState(v5Defaults);
    controller.update({ future: { v5Defaults: !v5Defaults } });
    assertState(!v5Defaults);
    controller.update({ future: { v5Defaults } });
    assertState(v5Defaults);
  });

  it("uses fullscreen turn spacing in full-height embeds and honors explicit spacing", () => {
    window.scrollTo = vi.fn();
    const mount = document.createElement("div");
    document.body.append(mount);
    const controller = createAgentExperience(mount, {
      apiUrl: "/dispatch", persistState: false, future: { v5Defaults },
      launcher: { enabled: false, fullHeight: true },
    });
    controllers.push(controller);
    const messages = mount.querySelector<HTMLElement>(".persona-widget-messages")!;
    expect(messages.style.gap).toContain("--persona-components-message-fullscreenGap");
    expect(mount.style.getPropertyValue("--persona-components-message-fullscreenGap"))
      .toBe(v5Defaults ? "28px" : "");
    controller.update({ theme: { components: { message: { gap: "33px" } } } });
    expect(mount.style.getPropertyValue("--persona-components-message-fullscreenGap")).toBe("33px");
    controller.update({ theme: { components: { message: { fullscreenGap: "42px" } } } });
    expect(mount.style.getPropertyValue("--persona-components-message-fullscreenGap")).toBe("42px");
  });
});
