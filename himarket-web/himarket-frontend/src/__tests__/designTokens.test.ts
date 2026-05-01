import { describe, expect, it } from "vitest";

import { antdTheme, designTokens } from "../../../shared/design-tokens";

describe("design tokens", () => {
  it("exports the Claude primary color for antd and shared consumers", () => {
    expect(antdTheme.token.colorPrimary).toBe("#D97757");
    expect(designTokens.colors.brand.primary).toBe("#D97757");
  });
});
