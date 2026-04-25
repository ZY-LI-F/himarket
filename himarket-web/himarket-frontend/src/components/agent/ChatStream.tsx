import { Empty, Tag } from "antd";
import { Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";

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
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:240ms]" />
    </span>
  );
}

function MessageBubble({ message }: { message: AgentChatMessage }) {
  const isUser = message.role === "user";
  const alignClass = isUser ? "items-end" : "items-start";
  const bubbleClass = isUser
    ? "bg-blue-50 text-gray-900"
    : "border border-gray-100 bg-white text-gray-800";
  return (
    <article className={`flex flex-col ${alignClass}`} data-testid="agent-message">
      <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
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
          <div className="mt-2 text-xs text-red-500">消息生成失败</div>
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
        <Empty description="在下方输入消息开始对话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
