import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MCP_THEME_TARGETS = [
  "src/pages/Mcp.tsx",
  "src/pages/McpSquare.tsx",
  "src/pages/MyMcp.tsx",
  "src/pages/McpCreatePage.tsx",
  "src/pages/McpDetail.tsx",
  "src/components/square/McpCard.tsx",
  "src/pages/mcpTheme.css",
] as const;

const INLINE_HEX_COLOR = /#[\dA-Fa-f]{3,8}/;
const TAILWIND_ARBITRARY_HEX_COLOR = /\[#/;

function readTarget(file: string) {
  return readFileSync(join(process.cwd(), file), "utf8");
}

describe("mcp theme", () => {
  it("keeps modified MCP surface files free of inline hex colors", () => {
    for (const file of MCP_THEME_TARGETS) {
      const content = readTarget(file);
      expect(content, file).not.toMatch(INLINE_HEX_COLOR);
      expect(content, file).not.toMatch(TAILWIND_ARBITRARY_HEX_COLOR);
    }
  });

  it("themes MCP detail tabs and JSON highlighting through token classes", () => {
    const detailPage = readTarget("src/pages/McpDetail.tsx");
    const styles = readTarget("src/pages/mcpTheme.css");

    expect(detailPage).toContain("hm-mcp-tabs");
    expect(detailPage).toContain("hm-mcp-connection-tabs");
    expect(detailPage).toContain("hm-mcp-json-key");
    expect(styles).toContain(".hm-mcp-tabs.ant-tabs");
    expect(styles).toContain("var(--color-brand)");
    expect(styles).toContain("var(--color-neutral-200)");
  });

  it("routes MCP create-page fields through the FormField atom", () => {
    const createPage = readTarget("src/pages/McpCreatePage.tsx");

    expect(createPage).toContain('import { FormField } from "../components/common"');
    expect(createPage).toContain("FormField.Input");
    expect(createPage).toContain("FormField.TextArea");
    expect(createPage).toContain("FormField.Select");
    expect(createPage).not.toMatch(/<Input(?:\s|\.|>)/);
    expect(createPage).not.toMatch(/<Select(?:\s|\.|>)/);
    expect(createPage).not.toContain("Input.TextArea");
  });
});
