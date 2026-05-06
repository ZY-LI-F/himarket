export interface PubmedRecord {
  abstract?: string | null;
  abstractText?: string | null;
  authors?: readonly string[];
  doi?: string | null;
  journal?: string | null;
  meshTerms?: readonly string[];
  pmid: string;
  pub_date?: string | null;
  pubDate?: string | null;
  title?: string | null;
}

export interface PubmedSearchRequest {
  query: string;
  retmax: number;
  userId?: string;
}

export interface PubmedSearchResult {
  cacheHit?: boolean;
  hitCount?: number;
  pmids: readonly string[];
  query: string;
  records: readonly PubmedRecord[];
  returned: number;
  retmax: number;
  total: number;
  totalCount?: number;
  userId?: string;
}

export interface PubmedAttachRequest {
  pmid: string;
  projectId: string;
  userId?: string;
}

export interface PubmedAttachment {
  attachmentId: string;
  contentType: string;
  name: string;
  pmid: string;
  projectId: string;
  record: PubmedRecord;
  sourceType: string;
}

export interface PubmedClient {
  attachRecord(request: PubmedAttachRequest): Promise<PubmedAttachment>;
  searchRecords(request: PubmedSearchRequest): Promise<PubmedSearchResult>;
}

export interface PubmedSearchFormValues {
  disease: string;
  drug: string;
  endpoints: string;
  retmax?: number;
}

export interface PubmedResultItem {
  pmid: string;
  record?: PubmedRecord;
}
