// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildPubmedQuery, MAX_PUBMED_RESULTS, toPubmedResultItems } from './pubmedSearch';
import { PubmedSearchPanel } from './PubmedSearchPanel';

import type { PubmedClient, PubmedRecord, PubmedSearchResult } from './pubmedTypes';

afterEach(() => cleanup());

describe('PubmedSearchPanel query helpers', () => {
  it('builds PubMed text query from disease drug and endpoints', () => {
    expect(
      buildPubmedQuery({
        disease: ' lung   cancer ',
        drug: 'osimertinib',
        endpoints: 'progression-free survival, overall survival',
        retmax: MAX_PUBMED_RESULTS,
      }),
    ).toBe(
      '"lung cancer"[Title/Abstract] AND "osimertinib"[Title/Abstract] AND ("progression-free survival"[Title/Abstract] OR "overall survival"[Title/Abstract])',
    );
  });

  it('limits visible result items to fifty PMIDs', () => {
    const response = responseWithRecords(60);

    expect(toPubmedResultItems(response.records, response.pmids)).toHaveLength(MAX_PUBMED_RESULTS);
    expect(toPubmedResultItems(response.records, response.pmids).at(-1)?.pmid).toBe('1049');
  });
});

describe('PubmedSearchPanel', () => {
  it('submits disease drug and endpoints with retmax capped at fifty', async () => {
    const response = responseWithRecords(1);
    const client: PubmedClient = {
      attachRecord: vi.fn(),
      searchRecords: vi.fn(async () => response),
    };

    render(<PubmedSearchPanel client={client} projectId="project-1" />);

    fireEvent.change(screen.getByLabelText('疾病'), { target: { value: 'lung cancer' } });
    fireEvent.change(screen.getByLabelText('药物'), { target: { value: 'osimertinib' } });
    fireEvent.change(screen.getByLabelText('终点'), {
      target: { value: 'progression-free survival, overall survival' },
    });
    fireEvent.click(screen.getByRole('button', { name: '检索 PubMed' }));

    await waitFor(() => expect(client.searchRecords).toHaveBeenCalledTimes(1));
    expect(client.searchRecords).toHaveBeenCalledWith({
      query:
        '"lung cancer"[Title/Abstract] AND "osimertinib"[Title/Abstract] AND ("progression-free survival"[Title/Abstract] OR "overall survival"[Title/Abstract])',
      retmax: MAX_PUBMED_RESULTS,
      userId: undefined,
    });
    expect(await screen.findByText('PMID: 1000')).toBeInTheDocument();
  });

  it('lists no more than fifty PMIDs from the search response', async () => {
    const client: PubmedClient = {
      attachRecord: vi.fn(),
      searchRecords: vi.fn(async () => responseWithRecords(60)),
    };

    render(<PubmedSearchPanel client={client} projectId="project-1" />);

    fireEvent.change(screen.getByLabelText('疾病'), { target: { value: 'breast cancer' } });
    fireEvent.click(screen.getByRole('button', { name: '检索 PubMed' }));

    expect(await screen.findByText('PMID: 1000')).toBeInTheDocument();
    expect(screen.getByText('PMID: 1049')).toBeInTheDocument();
    expect(screen.queryByText('PMID: 1050')).not.toBeInTheDocument();
  });

  it('attaches a selected PMID to the current project', async () => {
    const response = responseWithRecords(1);
    const record = firstRecord(response);
    const onAttached = vi.fn();
    const client: PubmedClient = {
      attachRecord: vi.fn(async () => ({
        attachmentId: 'pubmed-1000',
        contentType: 'text/markdown',
        name: 'pubmed-1000.md',
        pmid: '1000',
        projectId: 'project-1',
        record,
        sourceType: 'pubmed',
      })),
      searchRecords: vi.fn(async () => response),
    };

    render(<PubmedSearchPanel client={client} onAttached={onAttached} projectId="project-1" />);

    fireEvent.change(screen.getByLabelText('疾病'), { target: { value: 'lung cancer' } });
    fireEvent.click(screen.getByRole('button', { name: '检索 PubMed' }));

    const attachButton = await screen.findByRole('button', {
      name: '绑定 PMID 1000 到项目',
    });
    fireEvent.click(attachButton);

    await waitFor(() => expect(client.attachRecord).toHaveBeenCalledTimes(1));
    expect(client.attachRecord).toHaveBeenCalledWith({
      pmid: '1000',
      projectId: 'project-1',
      userId: undefined,
    });
    expect(onAttached).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentId: 'pubmed-1000',
        projectId: 'project-1',
      }),
    );
    expect(await screen.findByRole('button', { name: 'PMID 1000 已绑定到项目' })).toBeDisabled();
  });
});

function firstRecord(response: PubmedSearchResult): PubmedRecord {
  const record = response.records[0];
  if (record === undefined) {
    throw new Error('test response missing record');
  }

  return record;
}

function responseWithRecords(count: number): PubmedSearchResult {
  const records = Array.from({ length: count }, (_, index) => {
    const pmid = String(1000 + index);
    return {
      abstractText: `Abstract ${index}`,
      authors: [`Author ${index}`],
      doi: null,
      journal: 'Journal',
      pmid,
      pubDate: '2024',
      title: `Title ${index}`,
    };
  });

  return {
    cacheHit: false,
    hitCount: 1,
    pmids: records.map((record) => record.pmid),
    query: 'test query',
    records,
    retmax: MAX_PUBMED_RESULTS,
    returned: count,
    total: count,
    totalCount: count,
    userId: 'user-a',
  };
}
