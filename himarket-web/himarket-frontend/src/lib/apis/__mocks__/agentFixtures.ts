import type {
  Room,
  RoomConfig,
  TeamTemplateList,
  Workspace,
  WorkspacePage,
} from "../agent";

export const OWNER_ID = "mock-user";
export const DEFAULT_WORKSPACE_ID = "ws-default";
export const DEFAULT_TEAM_TEMPLATE_ID = "team-default";
export const DEFAULT_MODEL_ID = "qwen-max";
export const ROOT_PREFIX = "/workspace";

const ACTIVE_STATUS = "ACTIVE";

export const DEFAULT_WORKSPACES: readonly Workspace[] = [
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

export const DEFAULT_ROOMS: readonly Room[] = [
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

function profile(id: string, role: string) {
  return {
    id,
    role,
    model: DEFAULT_MODEL_ID,
    systemPromptDigest: `sha256:mock-${id}`,
  };
}

export const DEFAULT_TEAM_TEMPLATES: TeamTemplateList = [
  {
    id: DEFAULT_TEAM_TEMPLATE_ID,
    name: "默认协作团队",
    version: "1.0.0",
    manager: profile("manager", "manager"),
    workers: [profile("developer", "developer")],
    defaultSkills: ["skill-code-review"],
    defaultMcps: ["mcp-filesystem"],
  },
];

export function copyRoom(room: Room): Room {
  return {
    ...room,
    permission: { ...room.permission, allowedUserIds: [...room.permission.allowedUserIds] },
  };
}

export function copyRoomConfig(config: RoomConfig): RoomConfig {
  return {
    ...config,
    mcpBindings: config.mcpBindings.map((binding) => ({ ...binding })),
    permission: {
      ...config.permission,
      allowedUserIds: [...config.permission.allowedUserIds],
    },
    skillBindings: config.skillBindings.map((binding) => ({ ...binding })),
  };
}

export function bindingRef(productId: string): RoomConfig["skillBindings"][number] {
  return { productId, version: "1.0.0", status: ACTIVE_STATUS };
}

export function defaultRoomConfig(room: Room): RoomConfig {
  return {
    roomId: room.id,
    modelId: room.modelId,
    teamTemplateId: room.teamTemplateId,
    skillBindings: [bindingRef("skill-code-review")],
    mcpBindings: [bindingRef("mcp-filesystem")],
    permission: { ...room.permission, allowedUserIds: [...room.permission.allowedUserIds] },
  };
}

export function workspacePage(items: Workspace[]): WorkspacePage {
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
