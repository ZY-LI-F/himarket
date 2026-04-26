import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Binding } from "../../../lib/apis/agent";
import { BindingActions } from "../BindingActions";

const CREATED_BINDING: Binding = {
  id: "binding-skill-new",
  roomId: "room-main",
  kind: "SKILL",
  productId: "skill-new",
  version: "1.2.3",
  status: "ACTIVE",
  createdAt: "2026-04-27T00:00:00.000Z",
};

describe("BindingActions", () => {
  it("installs a product into the current room", async () => {
    const createBinding = vi.fn().mockResolvedValue(CREATED_BINDING);
    const onChanged = vi.fn();

    render(
      <BindingActions
        createBinding={createBinding}
        kind="SKILL"
        onChanged={onChanged}
        productId="skill-new"
        roomId="room-main"
        version="1.2.3"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /安装/ }));

    await waitFor(() => {
      expect(createBinding).toHaveBeenCalledWith("room-main", {
        kind: "SKILL",
        productId: "skill-new",
        version: "1.2.3",
      });
      expect(onChanged).toHaveBeenCalledWith(CREATED_BINDING);
    });
    expect(await screen.findByText("已安装到当前房间")).toBeInTheDocument();
  });

  it("renders a clear toast for 403 subscription or permission errors", async () => {
    const createBinding = vi.fn().mockRejectedValue({
      response: {
        status: 403,
        data: {
          code: "BINDING_FORBIDDEN",
          message: "approved subscription is required",
        },
      },
    });
    const onChanged = vi.fn();

    render(
      <BindingActions
        createBinding={createBinding}
        kind="SKILL"
        onChanged={onChanged}
        productId="skill-new"
        roomId="room-main"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /安装/ }));

    expect(await screen.findByText(/未订阅或无权限/)).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
