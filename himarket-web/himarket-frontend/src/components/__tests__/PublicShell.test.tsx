import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../i18n";
import HomePage from "../../pages/Home";
import Square from "../../pages/Square";

const apiMocks = vi.hoisted(() => ({
  getCategoriesByProductType: vi.fn(),
  getProducts: vi.fn(),
}));

vi.mock("../../lib/apis", () => ({
  default: apiMocks,
  getCategoriesByProductType: apiMocks.getCategoriesByProductType,
  getProducts: apiMocks.getProducts,
}));

vi.mock("../../context/PortalConfigContext", () => ({
  usePortalConfig: () => ({
    portalId: "test-portal",
    isMenuVisible: () => true,
    firstVisiblePath: "/models",
    loading: false,
    visibleTabs: [
      { key: "models", path: "/models", label: "tabs.models" },
      { key: "mcp", path: "/mcp", label: "tabs.mcp" },
      { key: "agents", path: "/agents", label: "tabs.agents" },
      { key: "apis", path: "/apis", label: "tabs.apis" },
    ],
  }),
}));

vi.mock("../UserInfo", () => ({
  UserInfo: () => <div data-testid="user-info" />,
}));

vi.mock("../LanguageSwitcher", () => ({
  LanguageSwitcher: () => <button type="button">语言</button>,
}));

vi.mock("../TextType", () => ({
  default: ({ text }: { text: string | string[] }) => (
    <span>{Array.isArray(text) ? text[0] : text}</span>
  ),
}));

vi.mock("../card/ModelCard", () => ({
  default: () => <div data-testid="home-model-card">模型市场</div>,
}));

vi.mock("../card/HomeMcpCard", () => ({
  default: () => <div data-testid="home-mcp-card">MCP 市场</div>,
}));

vi.mock("../card/AgentCard", () => ({
  default: () => <div data-testid="home-agent-card">智能体市场</div>,
}));

vi.mock("../card/APICard", () => ({
  default: () => <div data-testid="home-api-card">API 市场</div>,
}));

vi.mock("../card/ChatCard", () => ({
  default: () => <div data-testid="home-chat-card">HiChat</div>,
}));

const SHELL_TARGETS = [
  "src/components/Layout.tsx",
  "src/components/Header.tsx",
  "src/components/Navigation.tsx",
  "src/components/ProductDetailLayout.tsx",
  "src/components/ProductHeader.tsx",
  "src/components/LoginPrompt.tsx",
  "src/components/WelcomeView.tsx",
  "src/components/UserInfo.tsx",
  "src/components/UserInfo.css",
] as const;

function renderAt(path: string, node: ReactNode) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      {node}
    </MemoryRouter>
  );
}

describe("public marketplace shell", () => {
  beforeEach(async () => {
    apiMocks.getCategoriesByProductType.mockReset();
    apiMocks.getProducts.mockReset();
    apiMocks.getCategoriesByProductType.mockResolvedValue({
      code: "SUCCESS",
      data: { content: [] },
    });
    apiMocks.getProducts.mockResolvedValue({
      code: "SUCCESS",
      data: { content: [], totalElements: 0 },
    });
    await i18n.changeLanguage("zh-CN");
  });

  it("keeps rewritten shell files free of inline hex colors", () => {
    for (const file of SHELL_TARGETS) {
      const content = readFileSync(join(process.cwd(), file), "utf8");
      expect(content, file).not.toMatch(/#[0-9A-Fa-f]{3,8}|\[#/);
    }
  });

  it("renders Home inside the new shell with brand-orange active navigation", () => {
    renderAt("/models", <HomePage />);

    expect(screen.getByRole("link", { name: "模型" })).toHaveClass(
      "bg-colorPrimary"
    );
    expect(
      screen.getByRole("contentinfo", { name: "Site footer" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("home-model-card")).toBeInTheDocument();
    expect(screen.getByTestId("user-info")).toBeInTheDocument();
  });

  it("renders Square inside the new shell without real network calls", async () => {
    renderAt("/models", <Square activeType="MODEL_API" />);

    expect(screen.getByRole("link", { name: "模型" })).toHaveClass(
      "bg-colorPrimary"
    );
    expect(screen.getByPlaceholderText("搜索名称...")).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.getCategoriesByProductType).toHaveBeenCalledWith({
        productType: "MODEL_API",
      });
      expect(apiMocks.getProducts).toHaveBeenCalled();
    });
  });
});
