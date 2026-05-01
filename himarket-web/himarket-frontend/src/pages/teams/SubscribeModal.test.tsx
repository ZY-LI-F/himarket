import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkerTeamProduct } from "../../services/teamSubscribe";
import SubscribeModal from "./SubscribeModal";

const team: WorkerTeamProduct = {
  productId: "team-1",
  name: "Support Team",
  version: "1.0.0",
  description: "Handles support workflows",
  members: [
    {
      role: "leader",
      refName: "triage-worker",
      refVersion: "1.0.0",
      ordinal: 1,
    },
    {
      role: "member",
      refName: "answer-worker",
      refVersion: "1.0.0",
      ordinal: 2,
    },
    {
      role: "member",
      refName: "audit-worker",
      refVersion: "1.1.0",
      ordinal: 3,
    },
    {
      role: "skill",
      refName: "summarize-skill",
      refVersion: "2.0.0",
      ordinal: 4,
    },
    { role: "skill", refName: "ticket-skill", refVersion: "2.1.0", ordinal: 5 },
  ],
};

describe("SubscribeModal", () => {
  it("lists every leader, member worker, and skill in the install closure", () => {
    render(
      <SubscribeModal
        confirmLoading={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open
        team={team}
      />
    );

    expect(screen.getByText("triage-worker")).toBeInTheDocument();
    expect(screen.getByText("answer-worker")).toBeInTheDocument();
    expect(screen.getByText("audit-worker")).toBeInTheDocument();
    expect(screen.getByText("summarize-skill")).toBeInTheDocument();
    expect(screen.getByText("ticket-skill")).toBeInTheDocument();
    expect(screen.getAllByTestId("team-install-item-leader")).toHaveLength(1);
    expect(screen.getAllByTestId("team-install-item-member")).toHaveLength(2);
    expect(screen.getAllByTestId("team-install-item-skill")).toHaveLength(2);
  });

  it("calls onConfirm from the primary subscribe button", () => {
    const onConfirm = vi.fn();
    render(
      <SubscribeModal
        confirmLoading={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        open
        team={team}
      />
    );

    const confirmButton = screen.getByRole("button", { name: "确认订阅" });
    expect(confirmButton).toHaveClass("hm-button--primary");

    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
