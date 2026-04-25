import type { IChatUsage, IToolCall, IToolResponse } from "./apis/chat";

const MAX_EVENTSOURCE_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 300;
const MAX_RECONNECT_DELAY_MS = 5_000;

export type ChatEventType =
  | "START"
  | "ASSISTANT"
  | "THINKING"
  | "TOOL_CALL"
  | "TOOL_RESULT"
  | "DONE"
  | "ERROR";

export interface ChatEvent {
  chatId: string;
  type: ChatEventType;
  content?: string | IToolCall | IToolResponse | null;
  usage?: IChatUsage;
  error?: string;
  message?: string;
}

export interface SSEOptions {
  onStart?: (chatId: string) => void;
  onChunk?: (content: string, chatId: string) => void;
  onToolCall?: (toolCall: IToolCall, chatId: string, usage?: IChatUsage) => void;
  onToolResponse?: (
    toolResponse: IToolResponse,
    chatId: string,
    usage?: IChatUsage,
  ) => void;
  onComplete?: (content: string, chatId: string, usage?: IChatUsage) => void;
  onError?: (error: string, code?: string, httpStatus?: number) => void;
}

export interface HandleSSEStreamParams {
  callbacks: SSEOptions;
  options: RequestInit;
  signal?: AbortSignal;
  url: string;
}

interface ChatStreamState {
  chatId: string;
  fullContent: string;
}

interface SubscribeState<T> {
  attempts: number;
  closed: boolean;
  onError?: (error: Event | Error) => void;
  onEvent: (event: T) => void;
  source: EventSource | null;
  timer: ReturnType<typeof setTimeout> | null;
  url: string;
}

function reconnectDelay(attempts: number) {
  const delay = BASE_RECONNECT_DELAY_MS * 2 ** attempts;
  return Math.min(delay, MAX_RECONNECT_DELAY_MS);
}

function closeSource<T>(state: SubscribeState<T>) {
  state.source?.close();
  state.source = null;
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

function scheduleReconnect<T>(state: SubscribeState<T>, connect: () => void) {
  if (state.closed || state.attempts >= MAX_EVENTSOURCE_ATTEMPTS) return;
  const delay = reconnectDelay(state.attempts);
  state.attempts += 1;
  state.timer = setTimeout(connect, delay);
}

function parseEventData<T>(rawData: string): T | null {
  if (rawData === "[DONE]") return null;
  return JSON.parse(rawData) as T;
}

function openEventSource<T>(state: SubscribeState<T>) {
  closeSource(state);
  const source = new EventSource(state.url);
  state.source = source;
  source.onmessage = (message) => {
    try {
      const parsed = parseEventData<T>(message.data);
      if (parsed) state.onEvent(parsed);
    } catch (error) {
      state.onError?.(error as Error);
    }
  };
  source.onerror = (event) => {
    closeSource(state);
    state.onError?.(event);
    scheduleReconnect(state, () => openEventSource(state));
  };
}

export function subscribeSSE<T>(
  url: string,
  onEvent: (event: T) => void,
  onError?: (error: Event | Error) => void,
) {
  const state: SubscribeState<T> = {
    attempts: 0,
    closed: false,
    onError,
    onEvent,
    source: null,
    timer: null,
    url,
  };
  openEventSource(state);
  return () => {
    state.closed = true;
    closeSource(state);
  };
}

function handleUnauthorizedStream() {
  localStorage.removeItem("access_token");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

function isChatEvent(message: unknown): message is ChatEvent {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    !("msgType" in message)
  );
}

function handleChatEvent(
  event: ChatEvent,
  state: ChatStreamState,
  callbacks: SSEOptions,
) {
  if (event.chatId && !state.chatId) state.chatId = event.chatId;
  if (event.type === "START") callbacks.onStart?.(event.chatId);
  if (event.type === "ASSISTANT") handleAssistantEvent(event, state, callbacks);
  if (event.type === "TOOL_CALL") handleToolCallEvent(event, callbacks);
  if (event.type === "TOOL_RESULT") handleToolResultEvent(event, callbacks);
  if (event.type === "DONE") {
    callbacks.onComplete?.(state.fullContent, event.chatId, event.usage);
  }
  if (event.type === "ERROR") {
    callbacks.onError?.(event.message || "Network error, please retry", event.error);
  }
}

function handleAssistantEvent(
  event: ChatEvent,
  state: ChatStreamState,
  callbacks: SSEOptions,
) {
  if (typeof event.content !== "string" || !event.chatId) return;
  state.fullContent += event.content;
  callbacks.onChunk?.(event.content, event.chatId);
}

function handleToolCallEvent(event: ChatEvent, callbacks: SSEOptions) {
  if (!event.content || typeof event.content !== "object") return;
  callbacks.onToolCall?.(event.content as IToolCall, event.chatId, event.usage);
}

function handleToolResultEvent(event: ChatEvent, callbacks: SSEOptions) {
  if (!event.content || typeof event.content !== "object") return;
  callbacks.onToolResponse?.(
    event.content as IToolResponse,
    event.chatId,
    event.usage,
  );
}

function processDataLine(
  data: string,
  state: ChatStreamState,
  callbacks: SSEOptions,
) {
  if (data === "[DONE]") {
    if (state.fullContent && state.chatId) {
      callbacks.onComplete?.(state.fullContent, state.chatId);
    }
    return;
  }
  const message = JSON.parse(data) as unknown;
  if (isChatEvent(message)) handleChatEvent(message, state, callbacks);
}

function processBufferedLines(
  lines: string[],
  state: ChatStreamState,
  callbacks: SSEOptions,
) {
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice("data:".length).trim();
    try {
      processDataLine(data, state, callbacks);
    } catch (error) {
      callbacks.onError?.(
        error instanceof Error ? error.message : "Failed to parse SSE message",
      );
    }
  }
}

export async function handleSSEStream(params: HandleSSEStreamParams) {
  const response = await fetch(params.url, {
    ...params.options,
    headers: {
      ...params.options.headers,
      Accept: "text/event-stream",
    },
    signal: params.signal,
  });
  if (!response.ok) {
    if (response.status === 403) handleUnauthorizedStream();
    params.callbacks.onError?.(`HTTP error! status: ${response.status}`);
    return;
  }
  await readSSEBody(response, params.callbacks);
}

async function readSSEBody(response: Response, callbacks: SSEOptions) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is null");
  const decoder = new TextDecoder();
  const state: ChatStreamState = { chatId: "", fullContent: "" };
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      processBufferedLines(lines, state, callbacks);
    }
  } finally {
    reader.releaseLock();
  }
}
