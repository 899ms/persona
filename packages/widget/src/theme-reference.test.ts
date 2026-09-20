import { describe, expect, it } from "vitest";

import { getThemeReference } from "./theme-reference";
import { resolveDefaults } from "./defaults";
import { resolveThemeDefaults } from "./utils/tokens";

describe("theme reference defaults versioning", () => {
  it("reads its documented defaults from the shared future-aware resolvers", () => {
    const reference = getThemeReference({ v5Defaults: true });
    const future = { v5Defaults: true };

    expect(reference.defaultsVersion).toBe("v5");
    expect(reference.themeDefaultsVersion).toBe("v5");
    expect(reference.defaultColorPalette).toBe(
      resolveThemeDefaults(future).palette.colors
    );
    expect(reference.defaultRadius).toBe(resolveThemeDefaults(future).palette.radius);
    expect(reference.defaultLauncher).toBe(resolveDefaults({ future }).launcher);
  });
});
