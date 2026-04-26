import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventTimeline } from "../EventTimeline";
import type { TaskEvent } from "../../../lib/apis/agent";

const TIMESTAMP = "2026-04-26T12:00:00.000Z";

function event(
  seq: number,
  kind: TaskEvent["kind"],
  payload: TaskEvent["payload"],
  agentId = "manager"
): TaskEvent {
  return { seq, kind, agentId, payload, timestamp: TIMESTAMP };
}

const EVENTS: TaskEvent[] = [
  event(1, "log", { message: "mock task accepted" }),
  event(2, "plan", { summary: "Build panel", steps: ["inspect", "implement"] }),
  event(3, "worker.assigned", { workerId: "worker-code", role: "developer" }),
  event(4, "tool.call", {
    toolName: "read_file",
    input: { path: "README.md" },
  }),
  event(5, "file.diff", {
    path: "src/App.tsx",
    diff: "- old line\n+ added line",
  }),
  event(6, "task.completed", { result: "mock ok" }),
  event(7, "task.failed", { stderr: "mock stderr" }),
];

describe("EventTimeline", () => {
  it("renders every task event kind with its timeline treatment", () => {
    render(<EventTimeline events={EVENTS} />);

    expect(screen.getByTestId("event-log")).toHaveTextContent(
      "mock task accepted"
    );
    expect(screen.queryByTestId("timeline-dot-log")).not.toBeInTheDocument();

    expect(screen.getByTestId("timeline-dot-plan")).toHaveClass("bg-blue-500");
    expect(screen.getByText("inspect")).toBeInTheDocument();

    expect(screen.getByTestId("timeline-dot-worker.assigned")).toHaveClass(
      "bg-gray-400"
    );
    expect(screen.getByTestId("event-worker.assigned")).toHaveClass("ml-10");
    expect(screen.getByText("worker-code")).toBeInTheDocument();

    expect(screen.getByTestId("timeline-dot-tool.call")).toHaveClass(
      "bg-orange-500"
    );
    expect(screen.getByText("read_file")).toBeInTheDocument();

    expect(screen.getByTestId("timeline-dot-file.diff")).toHaveClass(
      "bg-purple-500"
    );
    expect(screen.getByText("src/App.tsx")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Diff view" })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show diff" }));
    expect(screen.getByRole("region", { name: "Diff view" })).toHaveTextContent(
      "+ added line"
    );

    expect(screen.getByTestId("timeline-dot-task.completed")).toHaveClass(
      "bg-green-500"
    );
    expect(screen.getByText("mock ok")).toBeInTheDocument();
  });

  it("renders failed events with a red dot, failed badge, and open details", () => {
    render(<EventTimeline events={[EVENTS[6]]} />);

    expect(screen.getByTestId("timeline-dot-task.failed")).toHaveClass(
      "bg-red-500"
    );
    expect(screen.getByTestId("failure-badge")).toHaveClass("bg-red-600");
    expect(
      screen.getByRole("button", { name: "Show failure" })
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("region", { name: "Failure details" })
    ).toHaveTextContent("mock stderr");
  });
});
