import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { TaskRunPanel } from "../TaskRunPanel";
import type {
  SubscribeRoomTaskEventsParams,
  TaskEvent,
} from "../../../lib/apis/agent";

const TIMESTAMP = "2026-04-26T12:00:00.000Z";

function event(
  seq: number,
  kind: TaskEvent["kind"],
  payload: TaskEvent["payload"]
): TaskEvent {
  return { seq, kind, agentId: "mock-agent", payload, timestamp: TIMESTAMP };
}

const STREAM_EVENTS: TaskEvent[] = [
  event(1, "log", { message: "mock task accepted" }),
  event(2, "plan", { steps: ["inspect"] }),
  event(3, "worker.assigned", { workerId: "worker-code" }),
  event(4, "task.completed", { result: "mock ok" }),
];

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("TaskRunPanel", () => {
  beforeAll(() => {
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
  });

  it("submits a task, renders streamed events, and closes after a terminal event", async () => {
    const unsubscribe = vi.fn();
    let onEvent: ((event: TaskEvent) => void) | undefined;
    const startTask = vi.fn(() =>
      Promise.resolve({ taskId: "task-1", status: "RUNNING" })
    );
    const subscribeEvents = vi.fn((params: SubscribeRoomTaskEventsParams) => {
      onEvent = params.onEvent;
      return unsubscribe;
    });

    const { unmount } = render(
      <TaskRunPanel
        loadTeamTemplates={() => Promise.resolve([])}
        roomId="room-main"
        startTask={startTask}
        subscribeEvents={subscribeEvents}
      />
    );

    fireEvent.change(
      screen.getByPlaceholderText("Describe the task for the agent team"),
      {
        target: { value: "Build a task panel" },
      }
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit task" }));

    await waitFor(() => expect(subscribeEvents).toHaveBeenCalledTimes(1));
    expect(startTask).toHaveBeenCalledWith("room-main", {
      prompt: "Build a task panel",
      mode: "task",
    });

    act(() => {
      for (const streamEvent of STREAM_EVENTS) {
        onEvent?.(streamEvent);
      }
    });

    expect(screen.getByTestId("event-log")).toHaveTextContent(
      "mock task accepted"
    );
    expect(screen.getByText("inspect")).toBeInTheDocument();
    expect(screen.getByText("worker-code")).toBeInTheDocument();
    expect(screen.getByText("mock ok")).toBeInTheDocument();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("cleans up an active subscription on unmount", async () => {
    const unsubscribe = vi.fn();
    const startTask = vi.fn(() =>
      Promise.resolve({ taskId: "task-2", status: "RUNNING" })
    );
    const subscribeEvents = vi.fn(() => unsubscribe);

    const { unmount } = render(
      <TaskRunPanel
        loadTeamTemplates={() => Promise.resolve([])}
        roomId="room-main"
        startTask={startTask}
        subscribeEvents={subscribeEvents}
      />
    );

    fireEvent.change(
      screen.getByPlaceholderText("Describe the task for the agent team"),
      {
        target: { value: "Keep streaming" },
      }
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit task" }));

    await waitFor(() => expect(subscribeEvents).toHaveBeenCalledTimes(1));
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
