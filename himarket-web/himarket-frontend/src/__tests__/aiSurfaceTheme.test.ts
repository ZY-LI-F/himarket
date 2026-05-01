import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const AI_SURFACE_FILES = [
  "src/pages/Agent.tsx",
  "src/pages/AgentDetail.tsx",
  "src/pages/Chat.tsx",
  "src/pages/Coding.tsx",
  "src/pages/Model.tsx",
  "src/pages/ModelDetail.tsx",
  "src/pages/SkillDetail.tsx",
  "src/pages/WorkerDetail.tsx",
  "src/pages/agent/RoomListPage.tsx",
  "src/pages/agent/WorkspaceListPage.tsx",
  "src/pages/agent/WorkspaceShell.tsx",
  "src/styles/agent-tokens.css",
] as const;

const AI_SURFACE_DIRS = [
  "src/components/agent",
  "src/components/chat",
  "src/components/coding",
  "src/components/skill",
  "src/components/send-button",
  "src/components/scroll-to-top",
  "src/components/switch-button.tsx",
] as const;

const INLINE_HEX = new RegExp("\\x23[\\dA-Fa-f]{3,8}|\\[\\x23");
const SOURCE_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);

function readTarget(file: string) {
  return readFileSync(join(process.cwd(), file), "utf8");
}

function collectSourceFiles(path: string): string[] {
  const fullPath = join(process.cwd(), path);
  if (!statSync(fullPath).isDirectory()) {
    return SOURCE_EXTENSIONS.has(path.slice(path.lastIndexOf("."))) ? [path] : [];
  }

  return readdirSync(fullPath).flatMap((entry) => {
    const child = `${path}/${entry}`;
    const childPath = join(process.cwd(), child);
    if (statSync(childPath).isDirectory()) {
      return collectSourceFiles(child);
    }
    const ext = child.slice(child.lastIndexOf("."));
    return SOURCE_EXTENSIONS.has(ext) ? [child] : [];
  });
}

describe("AI surface theme", () => {
  it("keeps AI, agent, chat, coding, and skill surfaces free of inline hex colors", () => {
    const files = [
      ...AI_SURFACE_FILES,
      ...AI_SURFACE_DIRS.flatMap(collectSourceFiles),
    ];

    for (const file of files) {
      expect(readTarget(file), file).not.toMatch(INLINE_HEX);
    }
  });

  it("uses neutral chat bubbles with brand assistant accents", () => {
    const messages = readTarget("src/components/chat/Messages.tsx");
    const agentMessages = readTarget("src/components/agent/ChatStream.tsx");

    expect(messages).toContain("bg-claude-neutral-100");
    expect(messages).toContain("border border-colorPrimary/20");
    expect(messages).toContain("bg-colorPrimary");
    expect(agentMessages).toContain("bg-claude-neutral-100");
    expect(agentMessages).toContain("border border-colorPrimary/20");
  });

  it("routes terminal colors through design tokens", () => {
    const terminalPanel = readTarget("src/components/coding/TerminalPanel.tsx");

    expect(terminalPanel).toContain('readDesignToken("--color-neutral-900")');
    expect(terminalPanel).toContain('readDesignToken("--color-neutral-200")');
    expect(terminalPanel).toContain('readDesignToken("--color-brand")');
  });
});
