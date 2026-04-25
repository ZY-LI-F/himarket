import request from "../api";
import type { components } from "../../types/agent";
import * as mockAgentApi from "./__mocks__/agent";

export type Workspace = components["schemas"]["Workspace"];
export type WorkspacePage = components["schemas"]["WorkspacePage"];
export type CreateWorkspaceRequest =
  components["schemas"]["CreateWorkspaceRequest"];
export type UpdateWorkspaceRequest =
  components["schemas"]["UpdateWorkspaceRequest"];
export type Room = components["schemas"]["Room"];
export type RoomList = components["schemas"]["RoomList"];
export type CreateRoomRequest = components["schemas"]["CreateRoomRequest"];
export type UpdateRoomRequest = components["schemas"]["UpdateRoomRequest"];

export interface AgentApi {
  listWorkspaces: () => Promise<WorkspacePage>;
  createWorkspace: (data: CreateWorkspaceRequest) => Promise<Workspace>;
  getWorkspace: (id: string) => Promise<Workspace>;
  updateWorkspace: (
    id: string,
    data: UpdateWorkspaceRequest,
  ) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<Workspace>;
  listRooms: (workspaceId: string) => Promise<RoomList>;
  createRoom: (
    workspaceId: string,
    data: CreateRoomRequest,
  ) => Promise<Room>;
  getRoom: (id: string) => Promise<Room>;
  updateRoom: (id: string, data: UpdateRoomRequest) => Promise<Room>;
  deleteRoom: (id: string) => Promise<void>;
}

interface ErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const realAgentApi: AgentApi = {
  listWorkspaces: () =>
    request.get<WorkspacePage, WorkspacePage>("/agent/workspaces"),
  createWorkspace: (data) =>
    request.post<Workspace, Workspace, CreateWorkspaceRequest>(
      "/agent/workspaces",
      data,
    ),
  getWorkspace: (id) =>
    request.get<Workspace, Workspace>(`/agent/workspaces/${id}`),
  updateWorkspace: (id, data) =>
    request.put<Workspace, Workspace, UpdateWorkspaceRequest>(
      `/agent/workspaces/${id}`,
      data,
    ),
  deleteWorkspace: (id) =>
    request.delete<void, void>(`/agent/workspaces/${id}`),
  setActiveWorkspace: (id) =>
    request.put<Workspace, Workspace>(`/agent/workspaces/${id}/active`),
  listRooms: (workspaceId) =>
    request.get<RoomList, RoomList>(`/agent/workspaces/${workspaceId}/rooms`),
  createRoom: (workspaceId, data) =>
    request.post<Room, Room, CreateRoomRequest>(
      `/agent/workspaces/${workspaceId}/rooms`,
      data,
    ),
  getRoom: (id) => request.get<Room, Room>(`/agent/rooms/${id}`),
  updateRoom: (id, data) =>
    request.put<Room, Room, UpdateRoomRequest>(`/agent/rooms/${id}`, data),
  deleteRoom: (id) => request.delete<void, void>(`/agent/rooms/${id}`),
};

const selectedAgentApi: AgentApi =
  import.meta.env.VITE_AGENT_API === "real" ? realAgentApi : mockAgentApi;

export function getAgentApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  const candidate = error as ErrorLike;
  return candidate.response?.data?.message || candidate.message || fallbackMessage;
}

export const listWorkspaces = selectedAgentApi.listWorkspaces;
export const createWorkspace = selectedAgentApi.createWorkspace;
export const getWorkspace = selectedAgentApi.getWorkspace;
export const updateWorkspace = selectedAgentApi.updateWorkspace;
export const deleteWorkspace = selectedAgentApi.deleteWorkspace;
export const setActiveWorkspace = selectedAgentApi.setActiveWorkspace;
export const listRooms = selectedAgentApi.listRooms;
export const createRoom = selectedAgentApi.createRoom;
export const getRoom = selectedAgentApi.getRoom;
export const updateRoom = selectedAgentApi.updateRoom;
export const deleteRoom = selectedAgentApi.deleteRoom;
