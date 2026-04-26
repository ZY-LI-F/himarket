import type {
  CreateRoomRequest,
  CreateWorkspaceRequest,
  Room,
  RoomConfig,
  RoomList,
  StartTaskRequest,
  StartTaskResponse,
  SubscribeRoomTaskEventsParams,
  TaskEvent,
  TeamTemplateList,
  UpdateRoomRequest,
  UpdateWorkspaceRequest,
  Workspace,
  WorkspacePage,
} from "../agent";
import {
  DEFAULT_ROOMS,
  DEFAULT_TEAM_TEMPLATES,
  DEFAULT_WORKSPACES,
  OWNER_ID,
  ROOT_PREFIX,
  copyRoom,
  copyRoomConfig,
  defaultRoomConfig,
  workspacePage,
} from "./agentFixtures";

const MOCK_EVENT_DELAY_MS = 10;

let idSequence = 1;
let taskSequence = 1;
let workspaces: Workspace[] = [];
let rooms: Room[] = [];
let roomConfigs: RoomConfig[] = [];
let taskRequests: Record<string, StartTaskRequest> = {};

function createError(status: number, code: string, message: string) {
  return Object.assign(new Error(message), { status, code });
}

function now() {
  return new Date().toISOString();
}

function nextId(prefix: string) {
  idSequence += 1;
  return `${prefix}-${idSequence}`;
}

function findWorkspace(id: string) {
  const workspace = workspaces.find(item => item.id === id);
  if (!workspace)
    throw createError(404, "AGENT_WORKSPACE_NOT_FOUND", "工作区不存在");
  return workspace;
}

function findRoom(id: string) {
  const room = rooms.find(item => item.id === id);
  if (!room) throw createError(404, "AGENT_ROOM_NOT_FOUND", "房间不存在");
  return room;
}

function findRoomConfig(id: string) {
  findRoom(id);
  const existing = roomConfigs.find(item => item.roomId === id);
  if (existing) return existing;
  const created = defaultRoomConfig(findRoom(id));
  roomConfigs = [...roomConfigs, created];
  return created;
}

function assertUniqueWorkspaceName(name: string, ignoredId?: string) {
  const duplicate = workspaces.some(
    item => item.id !== ignoredId && item.name === name
  );
  if (duplicate) {
    throw createError(409, "AGENT_WORKSPACE_NAME_CONFLICT", "工作区名称已存在");
  }
}

function assertUniqueRoomName(
  workspaceId: string,
  name: string,
  ignoredId?: string
) {
  const duplicate = rooms.some(
    item =>
      item.workspaceId === workspaceId &&
      item.id !== ignoredId &&
      item.name === name
  );
  if (duplicate) {
    throw createError(409, "AGENT_ROOM_NAME_CONFLICT", "房间名称已存在");
  }
}

function taskEvent(seq: number, taskId: string, token: string): TaskEvent {
  return {
    seq,
    kind: "log",
    agentId: "manager",
    payload: { taskId, token, done: seq === 3 },
    timestamp: now(),
  };
}

function event(
  seq: number,
  taskId: string,
  kind: TaskEvent["kind"],
  payload: TaskEvent["payload"]
): TaskEvent {
  return {
    seq,
    kind,
    agentId: kind === "worker.assigned" ? "manager" : "mock-agent",
    payload: { ...payload, taskId },
    timestamp: now(),
  };
}

function mockChatEvents(taskId: string): TaskEvent[] {
  const prompt = taskRequests[taskId]?.prompt || "mock stream";
  return [
    taskEvent(1, taskId, "已收到："),
    taskEvent(2, taskId, prompt),
    taskEvent(3, taskId, "。Mock 回复完成。"),
  ];
}

function mockTaskRunEvents(taskId: string): TaskEvent[] {
  const request = taskRequests[taskId];
  const prompt = request?.prompt || "mock task";
  if (prompt.toLowerCase().includes("fail")) {
    return [
      event(1, taskId, "log", { message: "mock task accepted" }),
      event(2, taskId, "task.failed", {
        failureExcerpt: "mock stderr: bridge task failed",
      }),
    ];
  }
  return [
    event(1, taskId, "log", { message: "mock task accepted" }),
    event(2, taskId, "plan", {
      summary: prompt,
      steps: ["inspect workspace", "assign worker", "produce result"],
      teamTemplateId: request?.teamTemplateId,
    }),
    event(3, taskId, "worker.assigned", {
      workerId: "worker-code",
      role: "developer",
    }),
    event(4, taskId, "tool.call", {
      toolName: "read_file",
      input: { path: "README.md" },
    }),
    event(5, taskId, "file.diff", {
      path: "src/mock-task.ts",
      diff: "- old mock output\n+ new mock output",
    }),
    event(6, taskId, "task.completed", { result: "mock ok" }),
  ];
}

function mockTaskEvents(taskId: string): TaskEvent[] {
  return taskRequests[taskId]?.mode === "task"
    ? mockTaskRunEvents(taskId)
    : mockChatEvents(taskId);
}

export function resetAgentMockStore() {
  idSequence = 1;
  taskSequence = 1;
  workspaces = DEFAULT_WORKSPACES.map(workspace => ({ ...workspace }));
  rooms = DEFAULT_ROOMS.map(copyRoom);
  roomConfigs = rooms.map(defaultRoomConfig);
  taskRequests = {};
}

export async function listWorkspaces(): Promise<WorkspacePage> {
  return workspacePage(workspaces);
}

export async function createWorkspace(
  data: CreateWorkspaceRequest
): Promise<Workspace> {
  const name = data.name.trim();
  assertUniqueWorkspaceName(name);
  const timestamp = now();
  const workspace: Workspace = {
    id: nextId("ws"),
    name,
    description: data.description?.trim() || undefined,
    ownerId: OWNER_ID,
    defaultTeamTemplateId: data.defaultTeamTemplateId,
    isActive: workspaces.length === 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  workspaces = [...workspaces, workspace];
  return { ...workspace };
}

export async function getWorkspace(id: string): Promise<Workspace> {
  return { ...findWorkspace(id) };
}

export async function updateWorkspace(
  id: string,
  data: UpdateWorkspaceRequest
): Promise<Workspace> {
  const current = findWorkspace(id);
  const name = data.name.trim();
  assertUniqueWorkspaceName(name, id);
  const updated = {
    ...current,
    name,
    description: data.description?.trim() || undefined,
    defaultTeamTemplateId: data.defaultTeamTemplateId,
    updatedAt: now(),
  };
  workspaces = workspaces.map(item => (item.id === id ? updated : item));
  return { ...updated };
}

export async function deleteWorkspace(id: string): Promise<void> {
  findWorkspace(id);
  workspaces = workspaces.filter(item => item.id !== id);
  rooms = rooms.filter(item => item.workspaceId !== id);
  const roomIds = new Set(rooms.map(room => room.id));
  roomConfigs = roomConfigs.filter(item => roomIds.has(item.roomId));
  if (workspaces.length > 0 && !workspaces.some(item => item.isActive)) {
    const [firstWorkspace, ...rest] = workspaces;
    workspaces = [{ ...firstWorkspace, isActive: true }, ...rest];
  }
}

export async function setActiveWorkspace(id: string): Promise<Workspace> {
  findWorkspace(id);
  workspaces = workspaces.map(item => ({ ...item, isActive: item.id === id }));
  return { ...findWorkspace(id) };
}

export async function listRooms(workspaceId: string): Promise<RoomList> {
  findWorkspace(workspaceId);
  return rooms.filter(room => room.workspaceId === workspaceId).map(copyRoom);
}

export async function createRoom(
  workspaceId: string,
  data: CreateRoomRequest
): Promise<Room> {
  findWorkspace(workspaceId);
  const name = data.name.trim();
  assertUniqueRoomName(workspaceId, name);
  const timestamp = now();
  const room = buildRoom({ workspaceId, data: { ...data, name }, timestamp });
  rooms = [...rooms, room];
  roomConfigs = [...roomConfigs, defaultRoomConfig(room)];
  return copyRoom(room);
}

function buildRoom(params: {
  data: CreateRoomRequest;
  timestamp: string;
  workspaceId: string;
}): Room {
  return {
    id: nextId("room"),
    workspaceId: params.workspaceId,
    name: params.data.name,
    modelId: params.data.modelId,
    teamTemplateId: params.data.teamTemplateId,
    fileRoot: `${ROOT_PREFIX}/${params.workspaceId}/${params.data.name}`,
    permission: { readonly: false, allowedUserIds: [OWNER_ID] },
    createdAt: params.timestamp,
    updatedAt: params.timestamp,
  };
}

export async function getRoom(id: string): Promise<Room> {
  return copyRoom(findRoom(id));
}

export async function updateRoom(
  id: string,
  data: UpdateRoomRequest
): Promise<Room> {
  const current = findRoom(id);
  const name = data.name.trim();
  assertUniqueRoomName(current.workspaceId, name, id);
  const updated = {
    ...current,
    name,
    modelId: data.modelId,
    teamTemplateId: data.teamTemplateId,
    updatedAt: now(),
  };
  rooms = rooms.map(item => (item.id === id ? updated : item));
  roomConfigs = roomConfigs.map(config =>
    config.roomId === id ? { ...config, ...modelTeamIds(data) } : config
  );
  return copyRoom(updated);
}

function modelTeamIds(data: { modelId: string; teamTemplateId: string }) {
  return { modelId: data.modelId, teamTemplateId: data.teamTemplateId };
}

export async function deleteRoom(id: string): Promise<void> {
  findRoom(id);
  rooms = rooms.filter(item => item.id !== id);
  roomConfigs = roomConfigs.filter(item => item.roomId !== id);
}

export async function getRoomConfig(id: string): Promise<RoomConfig> {
  return copyRoomConfig(findRoomConfig(id));
}

export async function updateRoomConfig(
  id: string,
  data: RoomConfig
): Promise<RoomConfig> {
  if (data.roomId !== id) {
    throw createError(400, "AGENT_ROOM_CONFIG_CONFLICT", "房间配置 ID 不一致");
  }
  findRoom(id);
  const updated = copyRoomConfig(data);
  roomConfigs = roomConfigs.map(item => (item.roomId === id ? updated : item));
  rooms = rooms.map(room =>
    room.id === id ? { ...room, ...modelTeamIds(data) } : room
  );
  return copyRoomConfig(updated);
}

export async function listTeamTemplates(): Promise<TeamTemplateList> {
  return DEFAULT_TEAM_TEMPLATES.map(template => ({
    ...template,
    defaultMcps: [...template.defaultMcps],
    defaultSkills: [...template.defaultSkills],
    manager: { ...template.manager },
    workers: template.workers.map(worker => ({ ...worker })),
  }));
}

export async function startRoomTask(
  id: string,
  data: StartTaskRequest
): Promise<StartTaskResponse> {
  findRoom(id);
  const prompt = data.prompt.trim();
  if (!prompt)
    throw createError(400, "AGENT_TASK_PROMPT_EMPTY", "任务提示词不能为空");
  taskSequence += 1;
  const taskId = `task-${taskSequence}`;
  taskRequests = { ...taskRequests, [taskId]: { ...data, prompt } };
  return { taskId, status: "RUNNING" };
}

export function subscribeRoomTaskEvents(
  params: SubscribeRoomTaskEventsParams
): () => void {
  findRoom(params.id);
  const timers = mockTaskEvents(params.taskId).map((event, index) =>
    setTimeout(() => params.onEvent(event), MOCK_EVENT_DELAY_MS * (index + 1))
  );
  return () => timers.forEach(timer => clearTimeout(timer));
}

resetAgentMockStore();
