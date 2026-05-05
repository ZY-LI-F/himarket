import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Empty, Input, Select, Space, Table, Tag, Tooltip } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

import type { TableProps } from 'antd';

interface ProjectChapter {
  content?: string;
  id?: string;
  prompt?: string;
  status?: string;
  title?: string;
}

interface WritingProject {
  adminId?: string;
  adminName?: string;
  assembledDocument?: string;
  chapters?: ProjectChapter[];
  createAt?: string;
  createdAt?: string;
  developerId?: string;
  developerName?: string;
  id: string;
  lastDispatchedAt?: string;
  lastTaskId?: string;
  ownerId?: string;
  ownerName?: string;
  prompt?: string;
  roomId?: string;
  spec: string;
  status: string;
  teamId?: string;
  teamName?: string;
  teamTemplateId?: string;
  title: string;
  updatedAt?: string;
  userId?: string;
  userName?: string;
  version: string;
}

interface ProjectListFilters {
  keyword: string;
  spec: string;
  status: string;
  version: string;
}

interface ProjectPage {
  content: WritingProject[];
  current: number;
  pageSize: number;
  total: number;
}

interface PagePayload {
  content: WritingProject[];
  number?: number;
  size?: number;
  totalElements?: number;
}

interface StatusMeta {
  color: string;
  text: string;
}

const DEFAULT_FILTERS: ProjectListFilters = {
  keyword: '',
  spec: '',
  status: '',
  version: '',
};

const DEFAULT_PAGINATION = {
  current: 1,
  pageSize: 10,
  total: 0,
};

const PROJECT_STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '已分发', value: 'dispatched' },
  { label: '已组装', value: 'assembled' },
  { label: '重生成中', value: 'regenerating' },
];

const STATUS_META: Record<string, StatusMeta> = {
  assembled: { color: 'green', text: '已组装' },
  dispatched: { color: 'blue', text: '已分发' },
  draft: { color: 'default', text: '草稿' },
  regenerating: { color: 'processing', text: '重生成中' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getResponseData(response: unknown): unknown {
  if (isRecord(response) && 'data' in response) {
    return response.data;
  }
  return response;
}

function isPagePayload(value: unknown): value is PagePayload {
  return isRecord(value) && Array.isArray(value.content);
}

function textOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const text = value.trim();
  return text || undefined;
}

function firstText(...values: unknown[]): string | undefined {
  return values.map(textOrUndefined).find((value) => value !== undefined);
}

function normalizeFilters(filters: ProjectListFilters): ProjectListFilters {
  return {
    keyword: filters.keyword.trim(),
    spec: filters.spec.trim(),
    status: filters.status.trim(),
    version: filters.version.trim(),
  };
}

function buildProjectQueryParams(page: number, size: number, filters: ProjectListFilters) {
  return {
    ...(filters.keyword ? { keyword: filters.keyword } : {}),
    page,
    size,
    ...(filters.spec ? { spec: filters.spec } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.version ? { version: filters.version } : {}),
  };
}

function resolveOwner(project: WritingProject): string {
  return (
    firstText(
      project.ownerName,
      project.userName,
      project.developerName,
      project.adminName,
      project.ownerId,
      project.userId,
      project.developerId,
      project.adminId,
    ) || '-'
  );
}

function resolveTeam(project: WritingProject): string {
  return firstText(project.teamName, project.teamId, project.teamTemplateId, project.roomId) || '-';
}

function formatOptionalDate(value: string | undefined): string {
  return value ? formatDateTime(value) : '-';
}

function getProjectCreateTime(project: WritingProject): string | undefined {
  return firstText(project.createAt, project.createdAt);
}

function getStatusMeta(status: string): StatusMeta {
  return STATUS_META[status] || { color: 'default', text: status || '-' };
}

function matchesText(value: string | undefined, expected: string): boolean {
  return expected === '' || (value || '').toLowerCase().includes(expected.toLowerCase());
}

function filterProjects(projects: WritingProject[], filters: ProjectListFilters): WritingProject[] {
  const keyword = filters.keyword.toLowerCase();
  return projects.filter((project) => {
    const keywordValues = [
      project.id,
      project.roomId,
      project.spec,
      project.status,
      project.teamTemplateId,
      project.title,
      project.version,
      resolveOwner(project),
      resolveTeam(project),
    ].filter((value): value is string => value !== undefined);
    const matchesKeyword =
      keyword === '' || keywordValues.some((value) => value.toLowerCase().includes(keyword));

    return (
      matchesKeyword &&
      matchesText(project.spec, filters.spec) &&
      matchesText(project.status, filters.status) &&
      matchesText(project.version, filters.version)
    );
  });
}

function parseProjectPage(
  response: unknown,
  page: number,
  size: number,
  filters: ProjectListFilters,
): ProjectPage {
  const data = getResponseData(response);
  if (Array.isArray(data)) {
    const filteredProjects = filterProjects(data as WritingProject[], filters);
    const start = (page - 1) * size;
    return {
      content: filteredProjects.slice(start, start + size),
      current: page,
      pageSize: size,
      total: filteredProjects.length,
    };
  }

  if (isPagePayload(data)) {
    return {
      content: data.content,
      current: data.number || page,
      pageSize: data.size || size,
      total: data.totalElements || data.content.length,
    };
  }

  throw new Error('项目列表响应格式不正确');
}

export default function ProjectListPage() {
  const [draftFilters, setDraftFilters] = useState<ProjectListFilters>(DEFAULT_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProjectListFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [projects, setProjects] = useState<WritingProject[]>([]);

  const fetchProjects = useCallback(
    async (page = 1, size = DEFAULT_PAGINATION.pageSize, nextFilters = filters) => {
      setError(null);
      setLoading(true);
      try {
        const normalizedFilters = normalizeFilters(nextFilters);
        const response = await api.get('/projects', {
          params: buildProjectQueryParams(page, size, normalizedFilters),
        });
        const projectPage = parseProjectPage(response, page, size, normalizedFilters);
        setPagination({
          current: projectPage.current,
          pageSize: projectPage.pageSize,
          total: projectPage.total,
        });
        setProjects(projectPage.content);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : '加载项目列表失败';
        setError(message);
        setPagination({
          current: page,
          pageSize: size,
          total: 0,
        });
        setProjects([]);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    fetchProjects(1, DEFAULT_PAGINATION.pageSize, filters);
  }, [fetchProjects, filters]);

  const columns: TableProps<WritingProject>['columns'] = useMemo(
    () => [
      {
        dataIndex: 'title',
        key: 'title',
        render: (_value: unknown, record: WritingProject) => (
          <div className="min-w-0">
            <Tooltip placement="topLeft" title={record.title}>
              <div className="font-medium text-gray-900 truncate">{record.title}</div>
            </Tooltip>
            <div className="text-xs text-gray-500 mt-1">{record.id}</div>
          </div>
        ),
        title: '项目名称',
        width: 260,
      },
      {
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const meta = getStatusMeta(status);
          return <Tag color={meta.color}>{meta.text}</Tag>;
        },
        title: '状态',
        width: 110,
      },
      {
        key: 'spec',
        render: (_value: unknown, record: WritingProject) => (
          <Space size={4}>
            <Tag>{record.spec || '-'}</Tag>
            <span className="text-gray-500">{record.version || '-'}</span>
          </Space>
        ),
        title: '规范/版本',
        width: 180,
      },
      {
        key: 'owner',
        render: (_value: unknown, record: WritingProject) => resolveOwner(record),
        title: '用户',
        width: 160,
      },
      {
        key: 'team',
        render: (_value: unknown, record: WritingProject) => (
          <div className="min-w-0">
            <Tooltip placement="topLeft" title={resolveTeam(record)}>
              <div className="truncate">{resolveTeam(record)}</div>
            </Tooltip>
            {record.roomId && (
              <div className="text-xs text-gray-500 mt-1">Room: {record.roomId}</div>
            )}
          </div>
        ),
        title: '团队/房间',
        width: 190,
      },
      {
        key: 'chapters',
        render: (_value: unknown, record: WritingProject) => record.chapters?.length || 0,
        title: '章节数',
        width: 90,
      },
      {
        dataIndex: 'lastTaskId',
        key: 'lastTaskId',
        render: (lastTaskId: string | undefined) => lastTaskId || '-',
        title: '最近任务',
        width: 180,
      },
      {
        dataIndex: 'lastDispatchedAt',
        key: 'lastDispatchedAt',
        render: (lastDispatchedAt: string | undefined) => formatOptionalDate(lastDispatchedAt),
        title: '最近分发',
        width: 180,
      },
      {
        key: 'createAt',
        render: (_value: unknown, record: WritingProject) =>
          formatOptionalDate(getProjectCreateTime(record)),
        title: '创建时间',
        width: 180,
      },
    ],
    [],
  );

  const handleFilterChange = (key: keyof ProjectListFilters, value: string) => {
    setDraftFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  };

  const handleSearch = () => {
    setFilters(normalizeFilters(draftFilters));
  };

  const handleTableChange: TableProps<WritingProject>['onChange'] = (nextPagination) => {
    fetchProjects(
      nextPagination.current || DEFAULT_PAGINATION.current,
      nextPagination.pageSize || DEFAULT_PAGINATION.pageSize,
      filters,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">项目列表</h1>
          <p className="text-gray-500 mt-2">跨用户和团队查看写作项目</p>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchProjects(pagination.current, pagination.pageSize, filters)}
        >
          刷新
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          allowClear
          onChange={(event) => handleFilterChange('keyword', event.target.value)}
          onPressEnter={handleSearch}
          placeholder="搜索项目、用户、团队"
          style={{ width: 260 }}
          value={draftFilters.keyword}
        />
        <Input
          allowClear
          onChange={(event) => handleFilterChange('spec', event.target.value)}
          onPressEnter={handleSearch}
          placeholder="规范"
          style={{ width: 160 }}
          value={draftFilters.spec}
        />
        <Input
          allowClear
          onChange={(event) => handleFilterChange('version', event.target.value)}
          onPressEnter={handleSearch}
          placeholder="版本"
          style={{ width: 160 }}
          value={draftFilters.version}
        />
        <Select
          allowClear
          onChange={(value) => handleFilterChange('status', value || '')}
          options={PROJECT_STATUS_OPTIONS}
          placeholder="状态"
          style={{ width: 150 }}
          value={draftFilters.status || undefined}
        />
        <Button icon={<SearchOutlined />} onClick={handleSearch} type="primary">
          查询
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      <Table<WritingProject>
        columns={columns}
        dataSource={projects}
        loading={loading}
        locale={{
          emptyText: <Empty description="暂无项目" />,
        }}
        onChange={handleTableChange}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          pageSizeOptions: ['10', '20', '50', '100'],
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          total: pagination.total,
        }}
        rowKey="id"
        scroll={{ x: 1530 }}
      />
    </div>
  );
}
