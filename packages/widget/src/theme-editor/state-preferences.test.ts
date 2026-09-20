import { describe, expect, it } from "vitest";
import { ThemeEditorState } from "./state";

describe("ThemeEditorState preference reset", () => {
  it("unsets a path and prunes empty parent objects", () => {
    const state = new ThemeEditorState(undefined, {}, { mergeDefaults: false });
    state.set("features.artifacts.display.files", "inline");
    expect(state.get("features.artifacts.display.files")).toBe("inline");

    state.unset("features.artifacts.display.files");

    expect(state.get("features.artifacts.display.files")).toBeUndefined();
    expect(state.getConfig()).not.toHaveProperty("features");
  });

  it("preserves an authored v5 defaults opt-in across state reset", () => {
    const state = new ThemeEditorState(
      undefined,
      { future: { v5Defaults: true } },
    );

    expect(state.getConfig().future?.v5Defaults).toBe(true);
    expect(state.exportSnapshot().config.future).toEqual({ v5Defaults: true });

    state.resetToDefaults();

    expect(state.getConfig().future?.v5Defaults).toBe(true);
  });
});
