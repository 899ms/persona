// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentExperience } from "./ui";
import type { AgentWidgetConfig } from "./types";
import { isStatusIndicatorVisible } from "./utils/status-indicator";

const controllers: ReturnType<typeof createAgentExperience>[] = [];
const mountWidget = (config: Partial<AgentWidgetConfig>) => {
  window.scrollTo = vi.fn();
  const mount = document.createElement("div");
  document.body.append(mount);
  const controller = createAgentExperience(mount, {
    apiUrl: "/dispatch", persistState: false, launcher: { enabled: false }, ...config,
  });
  controllers.push(controller);
  return {
    controller,
    status: mount.querySelector<HTMLElement>("[data-persona-composer-status]")!,
    form: mount.querySelector<HTMLElement>("[data-persona-composer-form]")!,
  };
};
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.destroy());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe.each([false, true])("status indicator (v5=%s)", (v5Defaults) => {
  it("selects the default mode and placement", () => {
    const { status, form } = mountWidget({ future: { v5Defaults } });
    expect(status.style.display).toBe(v5Defaults ? "none" : "");
    expect(v5Defaults ? status.nextElementSibling : form.nextElementSibling)
      .toBe(v5Defaults ? form : status);
  });

  it("shows transient connection and error states, hiding idle and streaming", () => {
    const { controller, status, form } = mountWidget({
      future: { v5Defaults }, statusIndicator: { mode: "transient", errorText: "Try again" },
    });
    expect(status.nextElementSibling).toBe(form);
    for (const state of ["connecting", "connected", "error", "idle"] as const) {
      controller.injectTestMessage({ type: "status", status: state });
      expect(status.style.display, state).toBe(state === "connecting" || state === "error" ? "" : "none");
      if (state === "error") expect(status.textContent).toBe("Try again");
    }
  });

  it("honors explicit visibility and permits live mode changes", () => {
    const { controller, status, form } = mountWidget({
      future: { v5Defaults }, statusIndicator: { mode: "always", idleText: "Ready" },
    });
    expect(form.nextElementSibling).toBe(status);
    expect(status.style.display).toBe("");
    controller.update({ statusIndicator: { mode: "transient" } });
    expect(status.nextElementSibling).toBe(form);
    expect(status.style.display).toBe("none");
    controller.update({ statusIndicator: { visible: false } });
    controller.injectTestMessage({ type: "status", status: "connecting" });
    expect(status.style.display).toBe("none");
    controller.update({ statusIndicator: { mode: "always", visible: true } });
    expect(form.nextElementSibling).toBe(status);
    expect(status.style.display).toBe("");
  });

  it("keeps a composer lock reason readable in transient mode", () => {
    const { controller, status } = mountWidget({
      future: { v5Defaults }, statusIndicator: { mode: "transient" },
      composer: { inputDisabled: { reason: "Sign in to continue" } },
    });
    expect(status.textContent).toBe("Sign in to continue");
    expect(status.style.display).toBe("");
    controller.injectTestMessage({ type: "status", status: "connected" });
    expect(status.textContent).toBe("Sign in to continue");
    controller.update({ composer: { inputDisabled: false } });
    expect(status.style.display).toBe("none");
  });
});

it.each(["paused", "resuming"])("shows reconnect status %s in transient mode", (status) => {
  expect(isStatusIndicatorVisible({ mode: "transient" }, status)).toBe(true);
  expect(isStatusIndicatorVisible({ mode: "transient", visible: false }, status)).toBe(false);
});
