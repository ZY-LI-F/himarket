import { Tag } from "antd";
import { Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { Empty, emptyImages } from "../common";

export type AgentChatRole = "assistant" | "system" | "user";
export type AgentMessageStatus = "done" | "error" | "streaming";

export interface AgentChatMessage {
  content: string;
  createdAt?: string;
  fileRefs?: string[];
  id: string;
  role: AgentChatRole;
  status?: AgentMessageStatus;
}

interface ChatStreamProps {
  messages: AgentChatMessage[];
}

function roleIcon(role: AgentChatRole) {
  if (role === "user") return <User aria-hidden="true" size={16} />;
  return <Bot aria-hidden="true" size={16} />;
}

function roleLabel(role: AgentChatRole) {
  if (role === "user") return "You";
  if (role === "system") return "System";
  return "Agent";
}

function FileRefChips({ refs }: { refs: string[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap justify-end gap-1">
      {refs.map((ref) => (
        <Tag className="m-0 max-w-[220px] truncate" key={ref}>
          @file:{ref}
        </Tag>
      ))}
    </div>
  );
}

function StreamingDots() {
  return (
    <span aria-label="streaming" className="inline-flex items-center gap-1 pl-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-colorPrimary" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-colorPrimary [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-colorPrimary [animation-delay:240ms]" />
    </span>
  );
}

function MessageBubble({ message }: { message: AgentChatMessage }) {
  const isUser = message.role === "user";
  const alignClass = isUser ? "items-end" : "items-start";
  const bubbleClass = isUser
    ? "border border-claude-neutral-200 bg-claude-neutral-100 text-claude-neutral-900"
    : "border border-colorPrimary/20 bg-claude-neutral-50 text-claude-neutral-800";
  return (
    <article className={`flex flex-col ${alignClass}`} data-testid="agent-message">
      <div className="mb-1 flex items-center gap-2 text-xs text-claude-neutral-500">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-colorPrimaryBgHover text-colorPrimary">
          {roleIcon(message.role)}
        </span>
        <span>{roleLabel(message.role)}</span>
      </div>
      <div
        className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${bubbleClass}`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.status === "streaming" && <StreamingDots />}
        {message.status === "error" && (
          <div className="mt-2 text-xs text-claude-semantic-error">消息生成失败</div>
        )}
      </div>
      <FileRefChips refs={message.fileRefs ?? []} />
    </article>
  );
}

export function ChatStream({ messages }: ChatStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Empty description="在下方输入消息开始对话" image={emptyImages.simple} compact />
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" data-testid="agent-chat-stream">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
