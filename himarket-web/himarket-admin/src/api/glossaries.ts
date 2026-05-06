import api from '@/lib/api';
import type { ApiResponse } from '@/types';

export type GlossaryScope = 'global' | 'team' | 'user';

export interface GlossaryEntry {
  id: string;
  domain: string;
  term: string;
  preferred: string;
  aliases?: string[];
  abbreviation?: string;
  definition?: string;
  references?: Array<{ type: string; id: string; url?: string }>;
  scope: GlossaryScope;
  teamId?: string;
  userId?: string;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GlossaryListParams {
  scope?: GlossaryScope | 'all';
  team?: string;
  domain?: string;
}

export const glossariesApi = {
  list: (params: GlossaryListParams = {}) =>
    api.get('/admin/glossaries', { params }) as Promise<ApiResponse<GlossaryEntry[]>>,

  get: (id: string) => api.get(`/admin/glossaries/${id}`) as Promise<ApiResponse<GlossaryEntry>>,

  create: (entry: Partial<GlossaryEntry>) =>
    api.post('/admin/glossaries', entry) as Promise<ApiResponse<GlossaryEntry>>,

  update: (id: string, entry: Partial<GlossaryEntry>) =>
    api.put(`/admin/glossaries/${id}`, entry) as Promise<ApiResponse<GlossaryEntry>>,

  delete: (id: string) => api.delete(`/admin/glossaries/${id}`) as Promise<ApiResponse<void>>,
};
