import { Check, ExternalLink, Link2, Loader2, Search } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';

import { pubmedClient } from './pubmedClient';
import { buildPubmedQuery, MAX_PUBMED_RESULTS, toPubmedResultItems } from './pubmedSearch';

import type {
  PubmedAttachment,
  PubmedClient,
  PubmedRecord,
  PubmedSearchFormValues,
  PubmedSearchResult,
} from './pubmedTypes';

export interface PubmedSearchPanelProps {
  className?: string;
  client?: PubmedClient;
  defaultUserId?: string;
  onAttached?: (attachment: PubmedAttachment) => void;
  projectId?: string;
}

export function PubmedSearchPanel({
  className,
  client = pubmedClient,
  defaultUserId,
  onAttached,
  projectId,
}: PubmedSearchPanelProps) {
  const [attachedByPmid, setAttachedByPmid] = useState<Record<string, PubmedAttachment>>({});
  const [attachingPmids, setAttachingPmids] = useState<ReadonlySet<string>>(new Set());
  const [attachError, setAttachError] = useState<string | null>(null);
  const [formValue, setFormValue] = useState<PubmedSearchFormValues>({
    disease: '',
    drug: '',
    endpoints: '',
    retmax: MAX_PUBMED_RESULTS,
  });
  const [projectInput, setProjectInput] = useState(projectId ?? '');
  const [result, setResult] = useState<PubmedSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (projectId !== undefined) {
      setProjectInput(projectId);
    }
  }, [projectId]);

  const effectiveProjectId = (projectId ?? projectInput).trim();
  const resultItems = useMemo(
    () => (result ? toPubmedResultItems(result.records, result.pmids) : []),
    [result],
  );
  const rootClassName = ['rounded-lg border border-gray-200 bg-white p-4 shadow-sm', className]
    .filter(Boolean)
    .join(' ');

  const handleInputChange =
    (field: keyof Pick<PubmedSearchFormValues, 'disease' | 'drug' | 'endpoints'>) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      setFormValue((previous) => ({ ...previous, [field]: nextValue }));
    };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttachError(null);
    setSearchError(null);

    let query: string;
    try {
      query = buildPubmedQuery(formValue);
    } catch (error) {
      setSearchError(errorToMessage(error));
      return;
    }

    setSearching(true);
    try {
      const response = await client.searchRecords({
        query,
        retmax: MAX_PUBMED_RESULTS,
        userId: defaultUserId,
      });
      setAttachedByPmid({});
      setResult(response);
    } catch (error) {
      setSearchError(errorToMessage(error));
    } finally {
      setSearching(false);
    }
  };

  const handleAttach = async (pmid: string) => {
    setAttachError(null);

    if (!effectiveProjectId) {
      setAttachError('projectId must not be blank');
      return;
    }

    setAttachingPmids((previous) => new Set(previous).add(pmid));
    try {
      const attachment = await client.attachRecord({
        pmid,
        projectId: effectiveProjectId,
        userId: defaultUserId,
      });
      setAttachedByPmid((previous) => ({ ...previous, [pmid]: attachment }));
      onAttached?.(attachment);
    } catch (error) {
      setAttachError(errorToMessage(error));
    } finally {
      setAttachingPmids((previous) => {
        const next = new Set(previous);
        next.delete(pmid);
        return next;
      });
    }
  };

  return (
    <section aria-label="PubMed 文献检索" className={rootClassName}>
      <form className="space-y-4" onSubmit={handleSearch}>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="疾病" name="disease">
            <input
              aria-label="疾病"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              id="pubmed-disease"
              name="disease"
              onChange={handleInputChange('disease')}
              placeholder="例如 lung cancer"
              type="text"
              value={formValue.disease}
            />
          </Field>
          <Field label="药物" name="drug">
            <input
              aria-label="药物"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              id="pubmed-drug"
              name="drug"
              onChange={handleInputChange('drug')}
              placeholder="例如 osimertinib"
              type="text"
              value={formValue.drug}
            />
          </Field>
          <Field label="终点" name="endpoints">
            <textarea
              aria-label="终点"
              className="min-h-10 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              id="pubmed-endpoints"
              name="endpoints"
              onChange={handleInputChange('endpoints')}
              placeholder="PFS, OS, safety"
              rows={1}
              value={formValue.endpoints}
            />
          </Field>
        </div>

        {projectId === undefined && (
          <Field label="项目 ID" name="projectId">
            <input
              aria-label="项目 ID"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              id="pubmed-project-id"
              name="projectId"
              onChange={(event) => setProjectInput(event.target.value)}
              placeholder="用于绑定 PubMed 附件"
              type="text"
              value={projectInput}
            />
          </Field>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={searching}
            type="submit"
          >
            {searching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            检索 PubMed
          </button>
          <span className="text-xs text-gray-500">最多展示 {MAX_PUBMED_RESULTS} 条 PMID</span>
        </div>
      </form>

      {searchError && <ErrorNotice message={searchError} />}
      {attachError && <ErrorNotice message={attachError} />}

      {result && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="text-gray-700">
              PubMed 返回 {result.totalCount ?? result.total} 条，当前展示 {resultItems.length} 条
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>retmax {result.retmax}</span>
              {result.cacheHit && (
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">缓存命中</span>
              )}
            </div>
          </div>

          {resultItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
              暂无 PMID 结果
            </div>
          ) : (
            <ol className="space-y-3">
              {resultItems.map(({ pmid, record }) => (
                <li
                  className="rounded-lg border border-gray-200 px-4 py-3 transition hover:border-gray-300"
                  key={pmid}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <a
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
                        href={`https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        PMID: {pmid}
                        <ExternalLink size={13} />
                      </a>
                      <h3 className="mt-1 text-sm font-medium text-gray-900">
                        {record?.title || '未返回标题'}
                      </h3>
                      <RecordMeta record={record} />
                      <RecordAbstract record={record} />
                    </div>

                    <AttachButton
                      attached={Boolean(attachedByPmid[pmid])}
                      disabled={!effectiveProjectId}
                      loading={attachingPmids.has(pmid)}
                      onAttach={() => handleAttach(pmid)}
                      pmid={pmid}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

function AttachButton({
  attached,
  disabled,
  loading,
  onAttach,
  pmid,
}: {
  attached: boolean;
  disabled: boolean;
  loading: boolean;
  onAttach: () => void;
  pmid: string;
}) {
  const isDisabled = attached || disabled || loading;

  return (
    <button
      aria-label={attached ? `PMID ${pmid} 已绑定到项目` : `绑定 PMID ${pmid} 到项目`}
      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={isDisabled}
      onClick={onAttach}
      type="button"
    >
      {loading ? (
        <Loader2 className="animate-spin" size={14} />
      ) : attached ? (
        <Check className="text-emerald-600" size={14} />
      ) : (
        <Link2 size={14} />
      )}
      {attached ? '已绑定' : '绑定到项目'}
    </button>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div
      className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      role="alert"
    >
      {message}
    </div>
  );
}

function Field({ children, label, name }: { children: ReactNode; label: string; name: string }) {
  return (
    <label className="block" htmlFor={`pubmed-${name}`}>
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function RecordAbstract({ record }: { record?: PubmedRecord }) {
  const abstractText = record?.abstractText ?? null;

  if (!abstractText) {
    return null;
  }

  return (
    <details className="mt-2 text-xs text-gray-600">
      <summary className="cursor-pointer text-gray-500">摘要</summary>
      <p className="mt-1 whitespace-pre-wrap leading-5">{abstractText}</p>
    </details>
  );
}

function RecordMeta({ record }: { record?: PubmedRecord }) {
  const authors = formatAuthors(record?.authors);
  const pubDate = record?.pubDate ?? null;
  const secondary = [record?.journal, pubDate].filter(Boolean).join(' · ');

  if (!authors && !secondary && !record?.doi) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
      {authors && <span>{authors}</span>}
      {secondary && <span>{secondary}</span>}
      {record?.doi && <span>DOI: {record.doi}</span>}
    </div>
  );
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

function formatAuthors(authors?: readonly string[]): string {
  if (!authors || authors.length === 0) {
    return '';
  }

  const leadingAuthors = authors.slice(0, 3).join(', ');
  return authors.length > 3 ? `${leadingAuthors} 等` : leadingAuthors;
}

export default PubmedSearchPanel;
