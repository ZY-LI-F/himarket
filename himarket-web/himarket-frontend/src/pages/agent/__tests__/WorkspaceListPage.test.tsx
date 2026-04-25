import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAgentMockStore } from "../../../lib/apis/__mocks__/agent";
import WorkspaceListPage from "../WorkspaceListPage";

vi.mock("../../../components/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderPage() {
  render(
    <MemoryRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <WorkspaceListPage />
    </MemoryRouter>,
  );
}

function openCreateModal() {
  fireEvent.click(screen.getByRole("button", { name: /创建工作区/ }));
}

function submitCreateModal() {
  const dialog = screen.getByRole("dialog", { name: "创建工作区" });
  fireEvent.click(within(dialog).getByRole("button", { name: /创\s*建/ }));
}

describe("WorkspaceListPage", () => {
  beforeAll(() => {
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
  });

  beforeEach(() => {
    resetAgentMockStore();
  });

  it("renders seeded workspaces, creates a workspace, and sets it active", async () => {
    renderPage();

    expect(await screen.findByText("默认研发工作区")).toBeInTheDocument();

    openCreateModal();
    fireEvent.change(screen.getByLabelText("工作区名称"), {
      target: { value: "发布工作区" },
    });
    submitCreateModal();

    expect(await screen.findByText("发布工作区")).toBeInTheDocument();

    const createdRow = screen.getByText("发布工作区").closest("tr");
    expect(createdRow).not.toBeNull();
    fireEvent.click(
      within(createdRow as HTMLElement).getByRole("button", {
        name: "设为活跃",
      }),
    );

    await waitFor(() => {
      const activeRow = screen.getByText("发布工作区").closest("tr");
      expect(within(activeRow as HTMLElement).getByText("活跃")).toBeInTheDocument();
    });
  });

  it("shows the mock 409 error when creating a duplicate workspace", async () => {
    renderPage();

    expect(await screen.findByText("默认研发工作区")).toBeInTheDocument();

    openCreateModal();
    fireEvent.change(screen.getByLabelText("工作区名称"), {
      target: { value: "默认研发工作区" },
    });
    submitCreateModal();

    expect(await screen.findByText("工作区名称已存在")).toBeInTheDocument();
  });
});
