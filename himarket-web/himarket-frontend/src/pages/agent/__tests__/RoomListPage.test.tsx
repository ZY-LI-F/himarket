import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAgentMockStore } from "../../../lib/apis/__mocks__/agent";
import RoomListPage from "../RoomListPage";

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
      initialEntries={["/agent/workspaces/ws-default/rooms"]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route path="/agent/workspaces/:wsId/rooms" element={<RoomListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function openCreateModal() {
  fireEvent.click(screen.getByRole("button", { name: /创建房间/ }));
}

function submitCreateModal() {
  const dialog = screen.getByRole("dialog", { name: "创建房间" });
  fireEvent.click(within(dialog).getByRole("button", { name: /创\s*建/ }));
}

describe("RoomListPage", () => {
  beforeAll(() => {
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
  });

  beforeEach(() => {
    resetAgentMockStore();
  });

  it("renders seeded rooms and creates a room in the workspace", async () => {
    renderPage();

    expect(await screen.findByText("主开发房间")).toBeInTheDocument();
    expect(screen.getByText("代码评审房间")).toBeInTheDocument();

    openCreateModal();
    fireEvent.change(screen.getByLabelText("房间名称"), {
      target: { value: "发布验证房间" },
    });
    submitCreateModal();

    expect(await screen.findByText("发布验证房间")).toBeInTheDocument();
  });

  it("shows the mock 409 error when creating a duplicate room", async () => {
    renderPage();

    expect(await screen.findByText("主开发房间")).toBeInTheDocument();

    openCreateModal();
    fireEvent.change(screen.getByLabelText("房间名称"), {
      target: { value: "主开发房间" },
    });
    submitCreateModal();

    expect(await screen.findByText("房间名称已存在")).toBeInTheDocument();
  });
});
