import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatStream, type AgentChatMessage } from "../ChatStream";

const scrollIntoView = vi.fn();

function message(
  id: string,
  role: AgentChatMessage["role"],
  content: string,
): AgentChatMessage {
  return { id, role, content, status: "done" };
}

describe("Agent ChatStream", () => {
  beforeEach(() => {
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it("renders an empty state before the first message", () => {
    render(<ChatStream messages={[]} />);

    expect(screen.getByText("在下方输入消息开始对话")).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("renders user and assistant messages and follows appended stream content", () => {
    const firstMessages = [
      message("u1", "user", "请总结 README"),
      { ...message("a1", "assistant", "好的"), status: "streaming" as const },
    ];
    const { rerender } = render(<ChatStream messages={firstMessages} />);

    expect(screen.getByText("请总结 README")).toBeInTheDocument();
    expect(screen.getByText("好的")).toBeInTheDocument();

    rerender(
      <ChatStream
        messages={[
          firstMessages[0],
          { ...firstMessages[1], content: "好的，README 已总结" },
        ]}
      />,
    );

    expect(screen.getByText("好的，README 已总结")).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});
