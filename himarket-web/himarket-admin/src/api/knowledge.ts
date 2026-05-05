import api from '@/lib/api';
import type { ApiResponse } from '@/types';

export type KnowledgeScope = 'global' | 'team' | 'user';

export interface KnowledgeAsset {
  apiVersion?: string;
  applicableWorkers?: string[];
  category: string;
  createAt?: string;
  deletedAt?: string;
  description?: string;
  domain?: string;
  enabled?: boolean;
  etag?: string;
  id: string;
  inheritsFrom?: string;
  kind: string;
  lastSyncedAt?: string;
  name: string;
  ownerId?: string;
  payload?: Record<string, unknown>;
  scope: KnowledgeScope;
  severity?: string;
  syncPending?: boolean;
  teamId?: string;
  updatedAt?: string;
  userId?: string;
  version?: number;
}

export interface GetKnowledgeSchemaParams {
  category: string;
  kind: string;
}

export interface ListKnowledgeAssetsParams {
  category: string;
  scope: KnowledgeScope;
}

export interface KnowledgeSchemaResponse {
  category: string;
  kind: string;
  schema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
}

export interface SaveKnowledgeAssetRequest {
  applicableWorkers?: string[];
  category: string;
  description?: string;
  domain?: string;
  enabled: boolean;
  inheritsFrom?: string;
  kind: string;
  name: string;
  payload: Record<string, unknown>;
  scope: KnowledgeScope;
  severity?: string;
  teamId?: string;
  userId?: string;
}

export const knowledgeApi = {
  createKnowledgeAsset: (data: SaveKnowledgeAssetRequest) =>
    api.post('/admin/knowledge', data) as Promise<ApiResponse<KnowledgeAsset>>,
  getKnowledgeAsset: (id: string) =>
    api.get(`/admin/knowledge/${id}`) as Promise<ApiResponse<KnowledgeAsset>>,
  getKnowledgeSchema: (params: GetKnowledgeSchemaParams) =>
    api.get('/admin/knowledge/schema', { params }) as Promise<ApiResponse<KnowledgeSchemaResponse>>,
  listKnowledgeAssets: (params: ListKnowledgeAssetsParams) =>
    api.get('/admin/knowledge', { params }) as Promise<ApiResponse<KnowledgeAsset[]>>,
  updateKnowledgeAsset: (id: string, data: SaveKnowledgeAssetRequest, etag: string) =>
    api.put(`/admin/knowledge/${id}`, data, {
      headers: { 'If-Match': etag },
    }) as Promise<ApiResponse<KnowledgeAsset>>,
};
