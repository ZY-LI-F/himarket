import { LinkOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '../lib/api';

const { RangePicker } = DatePicker;

export interface PubmedRecord {
  pmid: string;
  title: string;
  authors?: string[];
  journal?: string;
  pubDate?: string;
  abstract?: string;
  doi?: string;
  meshTerms?: string[];
}

export interface PubmedDirection {
  disease?: string;
  drug?: string;
  endpoints?: string[];
  studyType?: string;
}

export interface PubmedSearchPanelProps {
  /** 项目方向，用于 query 自动构建 + 关联检索历史 */
  direction?: PubmedDirection;
  /** 项目 id，传入后检索结果会持久化到 pubmed_search 历史 */
  projectId?: string;
  /** 用户挑选并 attach 时回调（rows 是 mesh 记录） */
  onAttach?: (records: PubmedRecord[]) => void;
  /** 默认每次最多返回数 */
  defaultLimit?: number;
}

const STUDY_TYPE_OPTIONS = [
  { label: 'Randomized Controlled Trial', value: 'RCT' },
  { label: 'Meta-Analysis', value: 'Meta-Analysis' },
  { label: 'Systematic Review', value: 'Systematic Review' },
  { label: 'Cohort Study', value: 'Cohort Study' },
  { label: 'Case Report', value: 'Case Report' },
];

const buildDefaultQuery = (d: PubmedDirection | undefined): string => {
  if (!d) return '';
  const parts: string[] = [];
  if (d.disease) parts.push(d.disease);
  if (d.drug) parts.push(d.drug);
  if (d.endpoints?.length) parts.push(`(${d.endpoints.join(' OR ')})`);
  if (d.studyType) parts.push(`"${d.studyType}"`);
  return parts.join(' AND ');
};

const PubmedSearchPanel = ({
  direction,
  projectId,
  onAttach,
  defaultLimit = 50,
}: PubmedSearchPanelProps) => {
  const [form] = Form.useForm<{
    query: string;
    dateRange?: [Dayjs, Dayjs];
    studyTypes?: string[];
  }>();
  const [results, setResults] = useState<PubmedRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [attaching, setAttaching] = useState(false);

  const initialQuery = useMemo(() => buildDefaultQuery(direction), [direction]);

  useEffect(() => {
    if (initialQuery) form.setFieldValue('query', initialQuery);
  }, [initialQuery, form]);

  const handleSearch = useCallback(
    async (values: { query: string; dateRange?: [Dayjs, Dayjs]; studyTypes?: string[] }) => {
      if (!values.query.trim()) {
        message.warning('请输入检索词');
        return;
      }
      setLoading(true);
      setError(undefined);
      setSelectedRowKeys([]);
      try {
        const body: Record<string, unknown> = {
          query: values.query,
          limit: defaultLimit,
        };
        if (values.dateRange?.length === 2) {
          body.filters = {
            ...((body.filters as Record<string, unknown>) ?? {}),
            dateFrom: values.dateRange[0].format('YYYY-MM-DD'),
            dateTo: values.dateRange[1].format('YYYY-MM-DD'),
          };
        }
        if (values.studyTypes?.length) {
          body.filters = {
            ...((body.filters as Record<string, unknown>) ?? {}),
            studyTypes: values.studyTypes,
          };
        }
        if (projectId) body.projectId = projectId;
        const res = await api.post('/pubmed/search', body);
        const payload = res?.data?.data ?? res?.data ?? {};
        setResults(payload.records ?? []);
        setTotal(payload.total ?? (payload.records?.length ?? 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : '检索失败');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [defaultLimit, projectId],
  );

  const handleAttach = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择文献');
      return;
    }
    const picked = results.filter((r) => selectedRowKeys.includes(r.pmid));
    setAttaching(true);
    try {
      if (projectId) {
        await Promise.all(
          picked.map((r) =>
            api.post(`/pubmed/records/${r.pmid}/_attach`, { projectId, fetchPdf: false }),
          ),
        );
      }
      onAttach?.(picked);
      message.success(`已挂接 ${picked.length} 篇文献`);
      setSelectedRowKeys([]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '挂接失败');
    } finally {
      setAttaching(false);
    }
  }, [onAttach, projectId, results, selectedRowKeys]);

  return (
    <div>
      <Form
        form={form}
        initialValues={{ query: initialQuery }}
        layout="vertical"
        onFinish={handleSearch}
      >
        <Form.Item label="检索式" name="query" rules={[{ required: true }]}>
          <Input.TextArea
            autoSize={{ maxRows: 4, minRows: 2 }}
            placeholder="可使用 PubMed 标准检索语法，例如 disease AND drug AND randomized controlled trial"
          />
        </Form.Item>
        <Space wrap>
          <Form.Item label="发表日期范围" name="dateRange" style={{ marginBottom: 8 }}>
            <RangePicker />
          </Form.Item>
          <Form.Item label="研究类型" name="studyTypes" style={{ marginBottom: 8, minWidth: 280 }}>
            <Select
              allowClear
              maxTagCount="responsive"
              mode="multiple"
              options={STUDY_TYPE_OPTIONS}
              placeholder="可选"
            />
          </Form.Item>
        </Space>
        <Form.Item style={{ marginTop: 8 }}>
          <Space>
            <Button htmlType="submit" icon={<SearchOutlined />} loading={loading} type="primary">
              检索
            </Button>
            <Button
              disabled={selectedRowKeys.length === 0}
              icon={<LinkOutlined />}
              loading={attaching}
              onClick={handleAttach}
            >
              挂接选中（{selectedRowKeys.length}）
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {error && (
        <Alert closable message={error} showIcon style={{ marginBottom: 12 }} type="error" />
      )}

      {total > 0 && (
        <p style={{ color: '#666', marginBottom: 8 }}>
          命中 {total} 篇，展示前 {results.length} 篇。
        </p>
      )}

      <Spin spinning={loading}>
        {results.length === 0 && !loading ? (
          <Empty description="尚无检索结果" />
        ) : (
          <Table<PubmedRecord>
            columns={[
              { dataIndex: 'pmid', key: 'pmid', title: 'PMID', width: 110 },
              {
                dataIndex: 'title',
                key: 'title',
                render: (title: string, r: PubmedRecord) => (
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {title}
                  </a>
                ),
                title: '标题',
              },
              {
                dataIndex: 'journal',
                key: 'journal',
                render: (j?: string) => j || '-',
                title: '期刊',
                width: 200,
              },
              {
                dataIndex: 'pubDate',
                key: 'pubDate',
                render: (d?: string) => d?.slice(0, 10) || '-',
                title: '发表日期',
                width: 110,
              },
              {
                dataIndex: 'meshTerms',
                key: 'meshTerms',
                render: (terms?: string[]) =>
                  terms?.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>),
                title: 'MeSH',
                width: 220,
              },
            ]}
            dataSource={results}
            pagination={{ pageSize: 20 }}
            rowKey="pmid"
            rowSelection={{
              onChange: (keys) => setSelectedRowKeys(keys as string[]),
              selectedRowKeys,
            }}
            scroll={{ x: 'max-content' }}
            size="small"
          />
        )}
      </Spin>
    </div>
  );
};

export default PubmedSearchPanel;
