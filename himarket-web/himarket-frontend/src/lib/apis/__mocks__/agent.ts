import type {
  CreateRoomRequest,
  CreateWorkspaceRequest,
  Room,
  RoomList,
  UpdateRoomRequest,
  UpdateWorkspaceRequest,
  Workspace,
  WorkspacePage,
} from "../agent";

const OWNER_ID = "mock-user";
const DEFAULT_WORKSPACE_ID = "ws-default";
const DEFAULT_TEAM_TEMPLATE_ID = "team-default";
const DEFAULT_MODEL_ID = "qwen-max";
const ROOT_PREFIX = "/workspace";

const DEFAULT_WORKSPACES: readonly Workspace[] = [
  {
    id: DEFAULT_WORKSPACE_ID,
    name: "默认研发工作区",
    description: "用于验证 Agent Workspace CRUD 的内置 mock 数据",
    ownerId: OWNER_ID,
    defaultTeamTemplateId: DEFAULT_TEAM_TEMPLATE_ID,
    isActive: true,
    createdAt: "2026-04-25T00:00:00.000Z",
    updatedAt: "2026-04-25T00:00:00.000Z",
  },
];

const DEFAULT_ROOMS: readonly Room[] = [
  {
    id: "room-main",
    workspaceId: DEFAULT_WORKSPACE_ID,
    name: "主开发房间",
    modelId: DEFAULT_MODEL_ID,
    teamTemplateId: DEFAULT_TEAM_TEMPLATE_ID,
    fileRoot: `${ROOT_PREFIX}/default/main`,
    permission: { readonly: false, allowedUserIds: [OWNER_ID] },
    createdAt: "2026-04-25T00:10:00.000Z",
    updatedAt: "2026-04-25T00:10:00.000Z",
  },
  {
    id: "room-review",
    workspaceId: DEFAULT_WORKSPACE_ID,
    name: "代码评审房间",
    modelId: DEFAULT_MODEL_ID,
    teamTemplateId: DEFAULT_TEAM_TEMPLATE_ID,
    fileRoot: `${ROOT_PREFIX}/default/review`,
    permission: { readonly: false, allowedUserIds: [OWNER_ID] },
    createdAt: "2026-04-25T00:20:00.000Z",
    updatedAt: "2026-04-25T00:20:00.000Z",
  },
];

let idSequence = 1;
let workspaces: Workspace[] = [];
let rooms: Room[] = [];

function copyRoom(room: Room): Room {
  return {
    ...room,
    permission: {
      readonly: room.permission.readonly,
      allowedUserIds: [...room.permission.allowedUserIds],
    },
  };
}

function buildWorkspacePage(items: Workspace[]): WorkspacePage {
  return {
    content: items.map((workspace) => ({ ...workspace })),
    totalElements: items.length,
    totalPages: items.length > 0 ? 1 : 0,
    size: items.length,
    number: 0,
    first: true,
    last: true,
  };
}

function createError(status: number, code: string, message: string) {
  return Object.assign(new Error(message), { status, code });
}

function normalizeName(name: string) {
  return name.trim();
}

function nextId(prefix: string) {
  idSequence += 1;
  return `${prefix}-${idSequence}`;
}

function now() {
  return new Date().toISOString();
}

function findWorkspace(id: string) {
  const workspace = workspaces.find((item) => item.id === id);
  if (!workspace) {
    throw createError(404, "AGENT_WORKSPACE_NOT_FOUND", "工作区不存在");
  }
  return workspace;
}

function findRoom(id: string) {
  const room = rooms.find((item) => item.id === id);
  if (!room) {
    throw createError(404, "AGENT_ROOM_NOT_FOUND", "房间不存在");
  }
  return room;
}

function assertUniqueWorkspaceName(name: string, ignoredId?: string) {
  const duplicate = workspaces.some(
    (item) => item.id !== ignoredId && item.name === name,
  );
  if (duplicate) {
    throw createError(409, "AGENT_WORKSPACE_NAME_CONFLICT", "工作区名称已存在");
  }
}

function assertUniqueRoomName(workspaceId: string, name: string, ignoredId?: string) {
  const duplicate = rooms.some(
    (item) =>
      item.workspaceId === workspaceId && item.id !== ignoredId && item.name === name,
  );
  if (duplicate) {
    throw createError(409, "AGENT_ROOM_NAME_CONFLICT", "房间名称已存在");
  }
}

export function resetAgentMockStore() {
  idSequence = 1;
  workspaces = DEFAULT_WORKSPACES.map((workspace) => ({ ...workspace }));
  rooms = DEFAULT_ROOMS.map(copyRoom);
}

export async function listWorkspaces(): Promise<WorkspacePage> {
  return buildWorkspacePage(workspaces);
}

export async function createWorkspace(
  data: CreateWorkspaceRequest,
): Promise<Workspace> {
  const name = normalizeName(data.name);
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
  data: UpdateWorkspaceRequest,
): Promise<Workspace> {
  const current = findWorkspace(id);
  const name = normalizeName(data.name);
  assertUniqueWorkspaceName(name, id);

  const updated: Workspace = {
    ...current,
    name,
    description: data.description?.trim() || undefined,
    defaultTeamTemplateId: data.defaultTeamTemplateId,
    updatedAt: now(),
  };
  workspaces = workspaces.map((item) => (item.id === id ? updated : item));
  return { ...updated };
}

export async function deleteWorkspace(id: string): Promise<void> {
  findWorkspace(id);
  workspaces = workspaces.filter((item) => item.id !== id);
  rooms = rooms.filter((item) => item.workspaceId !== id);
  if (workspaces.length > 0 && !workspaces.some((item) => item.isActive)) {
    const [firstWorkspace, ...rest] = workspaces;
    workspaces = [{ ...firstWorkspace, isActive: true }, ...rest];
  }
}

export async function setActiveWorkspace(id: string): Promise<Workspace> {
  findWorkspace(id);
  workspaces = workspaces.map((item) => ({ ...item, isActive: item.id === id }));
  return { ...findWorkspace(id) };
}

export async function listRooms(workspaceId: string): Promise<RoomList> {
  findWorkspace(workspaceId);
  return rooms.filter((room) => room.workspaceId === workspaceId).map(copyRoom);
}

export async function createRoom(
  workspaceId: string,
  data: CreateRoomRequest,
): Promise<Room> {
  findWorkspace(workspaceId);
  const name = normalizeName(data.name);
  assertUniqueRoomName(workspaceId, name);

  const timestamp = now();
  const room: Room = {
    id: nextId("room"),
    workspaceId,
    name,
    modelId: data.modelId,
    teamTemplateId: data.teamTemplateId,
    fileRoot: `${ROOT_PREFIX}/${workspaceId}/${name}`,
    permission: { readonly: false, allowedUserIds: [OWNER_ID] },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  rooms = [...rooms, room];
  return copyRoom(room);
}

export async function getRoom(id: string): Promise<Room> {
  return copyRoom(findRoom(id));
}

export async function updateRoom(
  id: string,
  data: UpdateRoomRequest,
): Promise<Room> {
  const current = findRoom(id);
  const name = normalizeName(data.name);
  assertUniqueRoomName(current.workspaceId, name, id);

  const updated: Room = {
    ...current,
    name,
    modelId: data.modelId,
    teamTemplateId: data.teamTemplateId,
    updatedAt: now(),
  };
  rooms = rooms.map((item) => (item.id === id ? updated : item));
  return copyRoom(updated);
}

export async function deleteRoom(id: string): Promise<void> {
  findRoom(id);
  rooms = rooms.filter((item) => item.id !== id);
}

resetAgentMockStore();
