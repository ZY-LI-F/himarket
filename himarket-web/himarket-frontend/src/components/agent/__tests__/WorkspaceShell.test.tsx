import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import WorkspaceShell from "../../../pages/agent/WorkspaceShell";

const AGENT_TOKEN_CSS = readFileSync(
  join(process.cwd(), "src/styles/agent-tokens.css"),
  "utf8",
);

vi.mock("../../UserInfo", () => ({
  UserInfo: () => <div data-testid="agent-user-menu" />,
}));

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function readStyle(testId: string): string | null {
  return screen.getByTestId(testId).getAttribute("style");
}

describe("WorkspaceShell", () => {
  beforeAll(() => {
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
  });

  it("renders three panes with agent theme tokens", () => {
    render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <WorkspaceShell />
      </MemoryRouter>,
    );

    const shellStyle = readStyle("agent-workspace-shell");
    const accentStyle = readStyle("agent-accent-marker");
    const paneIds = ["agent-left-pane", "agent-center-pane", "agent-right-pane"];

    for (const paneId of paneIds) {
      expect(screen.getByTestId(paneId)).toBeInTheDocument();
    }

    expect(shellStyle).toContain("var(--aliyun-blue)");
    expect(accentStyle).toContain("var(--agent-accent)");
    expect(AGENT_TOKEN_CSS).toContain("--aliyun-blue: #0064D2;");
    expect(AGENT_TOKEN_CSS).toContain("--agent-accent: #FA8C16;");

    expect({
      cssTokens: [
        "--aliyun-blue: #0064D2;",
        "--agent-accent: #FA8C16;",
        "--agent-radius-r10: 10px;",
      ],
      panes: paneIds,
      sections: ["Workspaces", "Files", "History"].map(
        (label) => screen.getByText(label).textContent,
      ),
      tabs: ["Chat", "Task Run", "Room Config", "Market"].map(
        (label) => screen.getByText(label).textContent,
      ),
      tokenStyles: {
        shell: shellStyle,
        accent: accentStyle,
        left: readStyle("agent-left-pane"),
        center: readStyle("agent-center-pane"),
        right: readStyle("agent-right-pane"),
      },
    }).toMatchInlineSnapshot(`
      {
        "cssTokens": [
          "--aliyun-blue: #0064D2;",
          "--agent-accent: #FA8C16;",
          "--agent-radius-r10: 10px;",
        ],
        "panes": [
          "agent-left-pane",
          "agent-center-pane",
          "agent-right-pane",
        ],
        "sections": [
          "Workspaces",
          "Files",
          "History",
        ],
        "tabs": [
          "Chat",
          "Task Run",
          "Room Config",
          "Market",
        ],
        "tokenStyles": {
          "accent": "background: var(--agent-accent); border-radius: var(--agent-radius-r6);",
          "center": "border-radius: var(--agent-radius-r14);",
          "left": "border-radius: var(--agent-radius-r10);",
          "right": "border-radius: var(--agent-radius-r10);",
          "shell": "border-top: 4px solid var(--aliyun-blue);",
        },
      }
    `);
  });
});
