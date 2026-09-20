// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  DEFAULT_HEADER_ICON_SIZE,
  DEFAULT_LAUNCHER_CONFIG,
} from "../defaults";
import { buildHeader } from "./header-builder";

describe("buildHeader tooltips", () => {
  it.each([{ v5Defaults: false }, { v5Defaults: true }])(
    "uses the standard padding token under v5Defaults=%s",
    (future) => {
      const { header } = buildHeader({ config: { future } as any });
      expect(header.style.padding).toBe(
        "var(--persona-components-header-padding, 20px 24px)"
      );
    }
  );
  it("uses the shared launcher icon default", () => {
    const { iconHolder } = buildHeader({});

    expect(DEFAULT_LAUNCHER_CONFIG.headerIconSize).toBe(DEFAULT_HEADER_ICON_SIZE);
    expect(iconHolder.style.height).toBe(DEFAULT_HEADER_ICON_SIZE);
    expect(iconHolder.style.width).toBe(DEFAULT_HEADER_ICON_SIZE);
  });

  it("portals the close-button tooltip into the mounted document", () => {
    const iframeDocument = document.implementation.createHTMLDocument("preview");
    const { header, closeButton, closeButtonWrapper } = buildHeader({
      config: {
        launcher: {
          clearChat: { enabled: false },
          closeButtonShowTooltip: true,
          closeButtonTooltipText: "Close chat"
        }
      } as any
    });

    iframeDocument.body.appendChild(header);

    expect(closeButton.ownerDocument).toBe(iframeDocument);

    closeButtonWrapper.dispatchEvent(new Event("mouseenter"));

    expect(iframeDocument.body.querySelector(".persona-control-tooltip")).not.toBeNull();
    expect(document.body.querySelector(".persona-control-tooltip")).toBeNull();

    closeButtonWrapper.dispatchEvent(new Event("mouseleave"));

    expect(iframeDocument.body.querySelector(".persona-control-tooltip")).toBeNull();
  });
});
