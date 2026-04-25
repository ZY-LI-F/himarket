import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  getRoomConfig,
  resetAgentMockStore,
} from "../../../lib/apis/__mocks__/agent";
import {
  RoomConfigDrawer,
  type RoomConfigOptionGroups,
} from "../RoomConfigDrawer";

const TEST_OPTIONS: RoomConfigOptionGroups = {
  models: [
    { label: "Qwen Max", value: "qwen-max" },
    { label: "Qwen Plus", value: "qwen-plus" },
  ],
  teamTemplates: [{ label: "Default Team", value: "team-default", version: "1.0.0" }],
  skills: [{ label: "Code Review", value: "skill-code-review", version: "1.0.0" }],
  mcps: [{ label: "Filesystem", value: "mcp-filesystem", version: "1.0.0" }],
};

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderDrawer() {
  render(
    <RoomConfigDrawer
      defaultOpen
      loadOptions={() => Promise.resolve(TEST_OPTIONS)}
      roomId="room-main"
    />,
  );
}

describe("RoomConfigDrawer", () => {
  beforeAll(() => {
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
  });

  beforeEach(() => {
    resetAgentMockStore();
  });

  it("saves model changes through the agent API mock", async () => {
    renderDrawer();

    expect(await screen.findByText("Qwen Max")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]);
    fireEvent.click(await screen.findByText("Qwen Plus"));
    fireEvent.click(screen.getByRole("button", { name: /保\s*存/ }));

    await waitFor(async () => {
      await expect(getRoomConfig("room-main")).resolves.toMatchObject({
        modelId: "qwen-plus",
      });
    });
  });
});
