import request, { type RespI } from '@/lib/request';

import { coercePubmedRetmax, limitPubmedRecords, MAX_PUBMED_RESULTS } from './pubmedSearch';

import type {
  PubmedAttachRequest,
  PubmedAttachment,
  PubmedClient,
  PubmedRecord,
  PubmedSearchRequest,
  PubmedSearchResult,
} from './pubmedTypes';

interface PubmedAttachmentPayload {
  attachmentId: string;
  contentType: string;
  name: string;
  pmid: string;
  project_id?: string;
  projectId?: string;
  record: PubmedRecordPayload;
  sourceType: string;
}

interface PubmedRecordPayload {
  abstract?: string | null;
  abstractText?: string | null;
  authors?: readonly string[];
  doi?: string | null;
  journal?: string | null;
  mesh_terms?: readonly string[];
  pmid: string;
  pub_date?: string | null;
  pubDate?: string | null;
  title?: string | null;
}

interface PubmedSearchPayload {
  cacheHit?: boolean;
  hitCount?: number;
  pmids?: readonly string[];
  query?: string;
  records?: readonly PubmedRecordPayload[];
  returned?: number;
  retmax?: number;
  total?: number;
  totalCount?: number;
  userId?: string;
}

function firstText(...values: readonly (null | string | undefined)[]): string | undefined {
  return values
    .find((value) => value !== null && value !== undefined && value.trim().length > 0)
    ?.trim();
}

function requireText(value: null | string | undefined, field: string): string {
  if (value === null || value === undefined || value.trim().length === 0) {
    throw new Error(`PubMed response missing ${field}`);
  }

  return value.trim();
}

function unwrapResponse<T>(response: RespI<T>, operation: string): T {
  if (response.code !== 'SUCCESS') {
    throw new Error(`${operation} failed: ${response.message ?? response.code}`);
  }

  if (response.data === null || response.data === undefined) {
    throw new Error(`${operation} failed: response data is empty`);
  }

  return response.data;
}

function normalizeRecord(record: PubmedRecordPayload): PubmedRecord {
  return {
    abstractText: firstText(record.abstractText, record.abstract),
    authors: record.authors || [],
    doi: firstText(record.doi),
    journal: firstText(record.journal),
    meshTerms: record.mesh_terms || [],
    pmid: record.pmid,
    pubDate: firstText(record.pubDate, record.pub_date),
    title: firstText(record.title),
  };
}

function normalizeSearchResult(
  payload: PubmedSearchPayload,
  requestQuery: string,
): PubmedSearchResult {
  const records = limitPubmedRecords((payload.records ?? []).map(normalizeRecord));
  const pmids =
    payload.pmids && payload.pmids.length > 0
      ? payload.pmids.slice(0, MAX_PUBMED_RESULTS)
      : records.map((record) => record.pmid);

  return {
    cacheHit: payload.cacheHit,
    hitCount: payload.hitCount,
    pmids,
    query: firstText(payload.query, requestQuery) ?? requestQuery,
    records,
    retmax: coercePubmedRetmax(payload.retmax),
    returned: records.length,
    total: payload.total ?? payload.totalCount ?? records.length,
    totalCount: payload.totalCount ?? payload.total,
    userId: payload.userId,
  };
}

function normalizeAttachment(payload: PubmedAttachmentPayload): PubmedAttachment {
  return {
    attachmentId: payload.attachmentId,
    contentType: payload.contentType,
    name: payload.name,
    pmid: payload.pmid,
    projectId: requireText(firstText(payload.projectId, payload.project_id), 'projectId'),
    record: normalizeRecord(payload.record),
    sourceType: payload.sourceType,
  };
}

export const pubmedClient: PubmedClient = {
  async attachRecord({ pmid, projectId, userId }: PubmedAttachRequest) {
    const response = await request.post<
      RespI<PubmedAttachmentPayload>,
      RespI<PubmedAttachmentPayload>
    >(`/pubmed/records/${encodeURIComponent(pmid)}/_attach`, {
      projectId,
      userId,
    });
    return normalizeAttachment(unwrapResponse(response, 'PubMed attach'));
  },
  async searchRecords({ query, retmax, userId }: PubmedSearchRequest) {
    const normalizedRetmax = coercePubmedRetmax(retmax);
    const response = await request.post<RespI<PubmedSearchPayload>, RespI<PubmedSearchPayload>>(
      '/pubmed/search',
      {
        query,
        retmax: normalizedRetmax,
        userId,
      },
    );
    return normalizeSearchResult(unwrapResponse(response, 'PubMed search'), query);
  },
};
