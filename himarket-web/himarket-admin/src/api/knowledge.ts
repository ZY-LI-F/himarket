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

export interface ListKnowledgeAssetsParams {
  category: string;
  scope: KnowledgeScope;
}

export const knowledgeApi = {
  listKnowledgeAssets: (params: ListKnowledgeAssetsParams) =>
    api.get('/admin/knowledge', { params }) as Promise<ApiResponse<KnowledgeAsset[]>>,
};
