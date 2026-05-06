import type { PubmedRecord, PubmedResultItem, PubmedSearchFormValues } from './pubmedTypes';

export const DEFAULT_PUBMED_RETMAX = 20;
export const MAX_PUBMED_RESULTS = 50;

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function escapePubmedPhrase(value: string): string {
  return normalizeText(value).replaceAll('"', '\\"');
}

function formatTitleAbstractTerm(value: string): string {
  return `"${escapePubmedPhrase(value)}"[Title/Abstract]`;
}

export function splitEndpointText(value: string): readonly string[] {
  return value
    .split(/[,;\n]+/)
    .map(normalizeText)
    .filter((item) => item.length > 0);
}

export function coercePubmedRetmax(value: number | null | undefined): number {
  const numericValue = Number.isFinite(value) ? Number(value) : DEFAULT_PUBMED_RETMAX;
  return Math.min(MAX_PUBMED_RESULTS, Math.max(1, Math.trunc(numericValue)));
}

export function buildPubmedQuery(values: PubmedSearchFormValues): string {
  const disease = normalizeText(values.disease);
  const drug = normalizeText(values.drug);
  const endpoints = splitEndpointText(values.endpoints);

  const parts = [
    ...(disease ? [formatTitleAbstractTerm(disease)] : []),
    ...(drug ? [formatTitleAbstractTerm(drug)] : []),
    ...(endpoints.length > 0 ? [`(${endpoints.map(formatTitleAbstractTerm).join(' OR ')})`] : []),
  ];

  if (parts.length === 0) {
    throw new Error('请至少输入疾病、药物或终点中的一项');
  }

  return parts.join(' AND ');
}

export function limitPubmedRecords(records: readonly PubmedRecord[]): readonly PubmedRecord[] {
  return records.slice(0, MAX_PUBMED_RESULTS);
}

export function toPubmedResultItems(
  records: readonly PubmedRecord[],
  pmids: readonly string[],
): readonly PubmedResultItem[] {
  const recordsByPmid = new Map(records.map((record) => [record.pmid, record]));
  const orderedPmids = pmids.length > 0 ? pmids : records.map((record) => record.pmid);
  const resultItems: PubmedResultItem[] = [];
  const seen = new Set<string>();

  for (const pmid of orderedPmids) {
    if (!pmid || seen.has(pmid) || resultItems.length >= MAX_PUBMED_RESULTS) {
      continue;
    }

    resultItems.push({ pmid, record: recordsByPmid.get(pmid) });
    seen.add(pmid);
  }

  for (const record of records) {
    if (!record.pmid || seen.has(record.pmid) || resultItems.length >= MAX_PUBMED_RESULTS) {
      continue;
    }

    resultItems.push({ pmid: record.pmid, record });
    seen.add(record.pmid);
  }

  return resultItems;
}
