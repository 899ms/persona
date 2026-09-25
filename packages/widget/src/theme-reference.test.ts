import { describe, expect, it } from "vitest";

import { getThemeReference } from "./theme-reference";
import { resolveDefaults } from "./defaults";
import { resolveThemeDefaults } from "./utils/tokens";

describe.each([false, true])("theme reference defaults versioning (v5=%s)", (v5Defaults) => {
  it("reads its documented defaults from the shared future-aware resolvers", () => {
    const reference = getThemeReference({ v5Defaults });
    const future = { v5Defaults };

    expect(reference.defaultsVersion).toBe(v5Defaults ? "v5" : "v4");
    expect(reference.themeDefaultsVersion).toBe(v5Defaults ? "v5" : "v4");
    expect(reference.defaultColorPalette).toBe(
      resolveThemeDefaults(future).palette.colors
    );
    expect(reference.defaultRadius).toBe(resolveThemeDefaults(future).palette.radius);
    expect(reference.defaultLauncher).toEqual(resolveDefaults({ future }).launcher);
  });
});
