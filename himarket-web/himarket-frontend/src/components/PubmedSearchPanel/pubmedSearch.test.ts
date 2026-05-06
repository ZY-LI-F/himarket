import { describe, expect, it } from 'vitest';

import {
  buildPubmedQuery,
  coercePubmedRetmax,
  limitPubmedRecords,
  MAX_PUBMED_RESULTS,
} from './pubmedSearch';

import type { PubmedRecord } from './pubmedTypes';

function recordAt(index: number): PubmedRecord {
  return {
    pmid: String(1000 + index),
    title: `Study ${index}`,
  };
}

describe('pubmedSearch', () => {
  it('builds a disease/drug/endpoints PubMed query', () => {
    expect(
      buildPubmedQuery({
        disease: ' non-small cell lung cancer ',
        drug: ' osimertinib ',
        endpoints: 'PFS\nOS, ORR',
        retmax: 20,
      }),
    ).toBe(
      '"non-small cell lung cancer"[Title/Abstract] AND "osimertinib"[Title/Abstract] AND ("PFS"[Title/Abstract] OR "OS"[Title/Abstract] OR "ORR"[Title/Abstract])',
    );
  });

  it('keeps PubMed result display within the accepted maximum', () => {
    const records = Array.from({ length: MAX_PUBMED_RESULTS + 5 }, (_value, index) =>
      recordAt(index),
    );

    expect(limitPubmedRecords(records)).toHaveLength(MAX_PUBMED_RESULTS);
    expect(coercePubmedRetmax(120)).toBe(MAX_PUBMED_RESULTS);
  });

  it('rejects empty search inputs explicitly', () => {
    expect(() =>
      buildPubmedQuery({
        disease: '',
        drug: ' ',
        endpoints: '',
        retmax: 20,
      }),
    ).toThrow('请至少输入疾病、药物或终点中的一项');
  });
});
