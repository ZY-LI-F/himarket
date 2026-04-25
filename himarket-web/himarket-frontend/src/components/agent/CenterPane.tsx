import { Alert, Tabs } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ChatStream, type AgentChatMessage } from "./ChatStream";
import { Composer, type AgentFileReference } from "./Composer";
import {
  getRoom,
  startRoomTask,
  subscribeRoomTaskEvents,
  type TaskEvent,
} from "../../lib/apis/agent";

const DEFAULT_ROOM_ID = "room-main";

function nextMessageId(role: AgentChatMessage["role"]) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function payloadString(event: TaskEvent, keys: string[]) {
  for (const key of keys) {
    const value = event.payload[key];
    if (typeof value === "string") return value;
  }
  return "";
}

function taskToken(event: TaskEvent) {
  return payloadString(event, ["token", "delta", "content", "message"]);
}

function isTaskDone(event: TaskEvent) {
  return event.kind === "task.completed" || event.payload.done === true;
}

function isTaskFailed(event: TaskEvent) {
  return event.kind === "task.failed";
}

function useRoomFileReferences(rid: string | undefined, roomId: string) {
  const [fileReferences, setFileReferences] = useState<AgentFileReference[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rid) {
      setFileReferences([]);
      return;
    }
    let mounted = true;
    void getRoom(roomId)
      .then((room) => {
        if (mounted && room.fileRoot) {
          setFileReferences([{ path: room.fileRoot, label: room.fileRoot }]);
        }
      })
      .catch((requestError) => {
        const message = requestError instanceof Error ? requestError.message : "加载房间失败";
        if (mounted) setError(message);
      });
    return () => {
      mounted = false;
    };
  }, [rid, roomId]);

  return { error, fileReferences };
}

function useMessageMutations(
  setMessages: React.Dispatch<React.SetStateAction<AgentChatMessage[]>>,
) {
  const updateAssistant = useCallback((id: string, patch: Partial<AgentChatMessage>) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    );
  }, [setMessages]);

  const appendToken = useCallback((id: string, token: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, content: `${message.content}${token}` } : message,
      ),
    );
  }, [setMessages]);

  return { appendToken, updateAssistant };
}

function useAgentChat(roomId: string) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mutations = useMessageMutations(setMessages);
  const handleTaskEvent = useTaskEventHandler({
    ...mutations,
    setStreaming,
    unsubscribeRef,
  });

  useEffect(() => () => unsubscribeRef.current?.(), []);

  const submitMessage = useCallback(
    async (payload: { fileRefs: string[]; text: string }) => {
      const assistantId = addSubmittedMessages(setMessages, payload);
      setStreaming(true);
      try {
        const task = await startRoomTask(roomId, {
          prompt: payload.text,
          files: payload.fileRefs,
          mode: "chat",
        });
        unsubscribeRef.current = subscribeRoomTaskEvents({
          id: roomId,
          taskId: task.taskId,
          onEvent: (event) => handleTaskEvent(assistantId, event),
          onError: () => setError("SSE 连接异常，正在重试"),
        });
        setError(null);
      } catch (requestError) {
        mutations.updateAssistant(assistantId, { status: "error" });
        setStreaming(false);
        setError(requestError instanceof Error ? requestError.message : "发送消息失败");
      }
    },
    [handleTaskEvent, mutations, roomId],
  );

  return { error, messages, streaming, submitMessage };
}

function addSubmittedMessages(
  setMessages: React.Dispatch<React.SetStateAction<AgentChatMessage[]>>,
  payload: { fileRefs: string[]; text: string },
) {
  const assistantId = nextMessageId("assistant");
  const userMessage: AgentChatMessage = {
    id: nextMessageId("user"),
    role: "user",
    content: payload.text,
    fileRefs: payload.fileRefs,
    status: "done",
  };
  setMessages((current) => [
    ...current,
    userMessage,
    { id: assistantId, role: "assistant", content: "", status: "streaming" },
  ]);
  return assistantId;
}

function useTaskEventHandler(params: {
  appendToken: (id: string, token: string) => void;
  setStreaming: (value: boolean) => void;
  unsubscribeRef: React.MutableRefObject<(() => void) | null>;
  updateAssistant: (id: string, patch: Partial<AgentChatMessage>) => void;
}) {
  return useCallback(
    (assistantId: string, event: TaskEvent) => {
      const token = taskToken(event);
      if (token) params.appendToken(assistantId, token);
      if (isTaskFailed(event)) {
        params.updateAssistant(assistantId, { status: "error" });
        params.setStreaming(false);
      }
      if (isTaskDone(event)) {
        params.updateAssistant(assistantId, { status: "done" });
        params.unsubscribeRef.current?.();
        params.unsubscribeRef.current = null;
        params.setStreaming(false);
      }
    },
    [params],
  );
}

function ChatTab(props: {
  error: string | null;
  fileReferences: AgentFileReference[];
  messages: AgentChatMessage[];
  onSubmit: (payload: { fileRefs: string[]; text: string }) => Promise<void>;
  streaming: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="agent-chat-tab">
      {props.error && <Alert className="mb-3" message={props.error} showIcon type="error" />}
      <ChatStream messages={props.messages} />
      <Composer
        disabled={props.streaming}
        fileReferences={props.fileReferences}
        onSubmit={props.onSubmit}
      />
    </div>
  );
}

export function CenterPane() {
  const { rid } = useParams();
  const roomId = rid || DEFAULT_ROOM_ID;
  const chat = useAgentChat(roomId);
  const roomFiles = useRoomFileReferences(rid, roomId);
  const error = chat.error || roomFiles.error;
  const centerTabs = [
    {
      key: "chat",
      label: "Chat",
      children: (
        <ChatTab
          error={error}
          fileReferences={roomFiles.fileReferences}
          messages={chat.messages}
          onSubmit={chat.submitMessage}
          streaming={chat.streaming}
        />
      ),
    },
    {
      key: "task-run",
      label: "Task Run",
      children: <div className="h-full" data-testid="agent-task-run-tab" />,
    },
  ];

  return (
    <main
      aria-label="Agent workspace center"
      className="h-full min-h-0 bg-white p-4 shadow-sm"
      data-testid="agent-center-pane"
      style={{ borderRadius: "var(--agent-radius-r14)" }}
    >
      <Tabs className="h-full" defaultActiveKey="chat" items={centerTabs} />
    </main>
  );
}
