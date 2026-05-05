import { BookOutlined, SearchOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Select, Space, Table, Tag, Tooltip } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { knowledgeApi } from '@/api/knowledge';
import type { KnowledgeAsset, KnowledgeScope } from '@/api/knowledge';

import type { TableProps } from 'antd';
import type { ChangeEvent } from 'react';

const DEFAULT_CATEGORY = 'doc_review';
const DEFAULT_SCOPE: KnowledgeScope = 'global';

const CATEGORY_OPTIONS = [{ label: '文档审查规则', value: DEFAULT_CATEGORY }];

const SCOPE_OPTIONS: Array<{ label: string; value: KnowledgeScope }> = [
  { label: '全局', value: 'global' },
  { label: '团队', value: 'team' },
  { label: '用户', value: 'user' },
];

const SCOPE_LABELS: Record<KnowledgeScope, string> = {
  global: '全局',
  team: '团队',
  user: '用户',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'red',
  info: 'blue',
  major: 'orange',
  minor: 'gold',
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '-';
  }

  return value.replace('T', ' ').slice(0, 19);
};

const getPayloadString = (payload: Record<string, unknown> | undefined, key: string): string => {
  const value = payload?.[key];
  return typeof value === 'string' ? value : '';
};

const getPayloadStringArray = (
  payload: Record<string, unknown> | undefined,
  key: string,
): string[] => {
  const value = payload?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const includesKeyword = (values: readonly string[], keyword: string): boolean =>
  values.some((value) => value.toLowerCase().includes(keyword));

export default function KnowledgeListPage() {
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [scope, setScope] = useState<KnowledgeScope>(DEFAULT_SCOPE);
  const [searchText, setSearchText] = useState('');

  const fetchKnowledgeAssets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await knowledgeApi.listKnowledgeAssets({ category, scope });
      setAssets(response.data ?? []);
      setPagination((current) => ({ ...current, current: 1 }));
    } catch (fetchError) {
      console.error('加载知识库失败:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : '知识库加载失败');
    } finally {
      setLoading(false);
    }
  }, [category, scope]);

  useEffect(() => {
    void fetchKnowledgeAssets();
  }, [fetchKnowledgeAssets]);

  const filteredAssets = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return assets;
    }

    return assets.filter((asset) =>
      includesKeyword(
        [
          asset.category,
          asset.description ?? '',
          asset.domain ?? '',
          asset.inheritsFrom ?? '',
          asset.kind,
          asset.name,
          asset.severity ?? '',
          getPayloadString(asset.payload, 'condition'),
          getPayloadString(asset.payload, 'key'),
          ...getPayloadStringArray(asset.payload, 'checks'),
        ],
        keyword,
      ),
    );
  }, [assets, searchText]);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPagination((current) => ({ ...current, current: 1 }));
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination({ current: page, pageSize });
  };

  const handleScopeChange = (value: KnowledgeScope) => {
    setScope(value);
    setPagination((current) => ({ ...current, current: 1 }));
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
    setPagination((current) => ({ ...current, current: 1 }));
  };

  const columns: TableProps<KnowledgeAsset>['columns'] = [
    {
      dataIndex: 'name',
      ellipsis: { showTitle: false },
      render: (_value: unknown, asset) => (
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded bg-blue-50 text-colorPrimary">
            <BookOutlined />
          </span>
          <div className="min-w-0">
            <Tooltip placement="topLeft" title={asset.name}>
              <div className="truncate font-medium text-gray-900">{asset.name}</div>
            </Tooltip>
            <div className="mt-1 flex flex-wrap gap-1">
              <Tag>{asset.kind}</Tag>
              <Tag>{asset.category}</Tag>
            </div>
          </div>
        </div>
      ),
      title: '知识资产',
      width: 260,
    },
    {
      dataIndex: 'scope',
      render: (value: KnowledgeScope) => <Tag color="blue">{SCOPE_LABELS[value] ?? value}</Tag>,
      title: '范围',
      width: 100,
    },
    {
      dataIndex: 'severity',
      render: (value?: string) =>
        value ? <Tag color={SEVERITY_COLORS[value] ?? 'default'}>{value}</Tag> : '-',
      title: '严重级别',
      width: 110,
    },
    {
      dataIndex: 'domain',
      ellipsis: { showTitle: false },
      render: (value?: string) => (
        <Tooltip placement="topLeft" title={value}>
          {value || '-'}
        </Tooltip>
      ),
      title: '领域',
      width: 140,
    },
    {
      dataIndex: 'description',
      ellipsis: { showTitle: false },
      render: (value?: string) => (
        <Tooltip placement="topLeft" title={value}>
          {value || '-'}
        </Tooltip>
      ),
      title: '描述',
    },
    {
      render: (_value: unknown, asset) => {
        const checks = getPayloadStringArray(asset.payload, 'checks');
        if (checks.length === 0) {
          return '-';
        }

        return (
          <Space size={[4, 4]} wrap>
            {checks.slice(0, 3).map((check) => (
              <Tag key={check}>{check}</Tag>
            ))}
            {checks.length > 3 && <Tag>+{checks.length - 3}</Tag>}
          </Space>
        );
      },
      title: '检查项',
      width: 220,
    },
    {
      dataIndex: 'syncPending',
      render: (value?: boolean) =>
        value ? <Tag color="orange">待同步</Tag> : <Tag color="green">已同步</Tag>,
      title: '同步',
      width: 100,
    },
    {
      dataIndex: 'updatedAt',
      render: (value?: string) => formatDateTime(value),
      title: '更新时间',
      width: 180,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">知识库</h1>
          <p className="mt-2 text-gray-500">管理文档审查规则等可复用知识资产</p>
        </div>
      </div>

      {error && (
        <Alert
          action={
            <Button loading={loading} onClick={() => void fetchKnowledgeAssets()} size="small">
              重试
            </Button>
          }
          message={error}
          showIcon
          type="error"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            onChange={handleScopeChange}
            options={SCOPE_OPTIONS}
            style={{ width: 120 }}
            value={scope}
          />
          <Select
            onChange={handleCategoryChange}
            options={CATEGORY_OPTIONS}
            style={{ width: 160 }}
            value={category}
          />
        </div>
        <div
          className="flex items-center overflow-hidden rounded-md border border-gray-300 hover:border-colorPrimary focus-within:border-colorPrimary"
          style={{ minWidth: 300 }}
        >
          <Input
            allowClear
            className="border-0"
            onChange={handleSearchChange}
            placeholder="搜索名称、描述、规则内容"
            value={searchText}
            variant="borderless"
          />
          <Button className="rounded-none border-0" icon={<SearchOutlined />} type="text" />
        </div>
      </div>

      <Table<KnowledgeAsset>
        columns={columns}
        dataSource={filteredAssets}
        loading={loading}
        locale={{
          emptyText: '暂无知识资产',
        }}
        pagination={{
          current: pagination.current,
          onChange: handlePageChange,
          pageSize: pagination.pageSize,
          pageSizeOptions: ['10', '20', '50'],
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          total: filteredAssets.length,
        }}
        rowKey="id"
      />
    </div>
  );
}
