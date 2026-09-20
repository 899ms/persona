import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIDGET_CONFIG,
  mergeWithDefaults,
  resolveDefaults,
  resolveDefaultsVersion,
} from "./defaults";

describe.each([false, true])("defaults resolver (v5Defaults: %s)", (v5Defaults) => {
  const future = { v5Defaults };

  it("selects the requested version without changing its initial defaults", () => {
    expect(resolveDefaultsVersion({ future })).toBe(v5Defaults ? "v5" : "v4");
    expect(resolveDefaults({ future })).toEqual(DEFAULT_WIDGET_CONFIG);
  });

  it("merges explicit options and nested theme overrides above the selected defaults", () => {
    const config = {
      future,
      launcher: { headerIconSize: "31px", title: "Custom title" },
      features: { reasoningDisplay: { expandable: false } },
      theme: { components: { header: { padding: "7px", title: { fontSize: "19px" } } } },
    };
    const result = mergeWithDefaults(config);
    expect(result.future).toEqual(future);
    expect(result.launcher?.headerIconSize).toBe("31px");
    expect(result.launcher?.title).toBe("Custom title");
    expect(result.features?.reasoningDisplay).toEqual({
      ...DEFAULT_WIDGET_CONFIG.features?.reasoningDisplay,
      expandable: false,
    });
    expect(result.theme?.components?.header).toEqual(config.theme.components.header);
    expect(resolveDefaults({ future }).launcher?.headerIconSize).toBe("40px");
  });
});

it("keeps the legacy defaults when the opt-in is missing", () => {
  expect(resolveDefaultsVersion()).toBe("v4");
  expect(resolveDefaultsVersion({ future: {} })).toBe("v4");
  expect(JSON.stringify(mergeWithDefaults())).toBe(JSON.stringify(DEFAULT_WIDGET_CONFIG));
});
