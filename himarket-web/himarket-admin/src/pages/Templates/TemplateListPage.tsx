import { ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Empty, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '@/lib/api';

import type { TableProps } from 'antd';

interface IchTemplate {
  id: number;
  outline: string;
  sectionOrder: number;
  sectionPath: string;
  sourcePath: string;
  spec: string;
  title?: string | null;
  version: string;
}

interface ImportIchBaselineResponse {
  seededResources: number;
}

type SpecFilter = 'ALL' | 'ICH-E2A' | 'ICH-E3' | 'ICH-E6-R3' | 'ICH-E8-R1' | 'ICH-E9';

const DEFAULT_VERSION = 'baseline';

const SPEC_OPTIONS: Array<{ label: string; value: SpecFilter }> = [
  { label: 'All specs', value: 'ALL' },
  { label: 'ICH-E2A', value: 'ICH-E2A' },
  { label: 'ICH-E3', value: 'ICH-E3' },
  { label: 'ICH-E6-R3', value: 'ICH-E6-R3' },
  { label: 'ICH-E8-R1', value: 'ICH-E8-R1' },
  { label: 'ICH-E9', value: 'ICH-E9' },
];

const SPEC_TAG_COLORS: Record<string, string> = {
  'ICH-E2A': 'cyan',
  'ICH-E3': 'blue',
  'ICH-E6-R3': 'green',
  'ICH-E8-R1': 'gold',
  'ICH-E9': 'purple',
};

function assertTemplateList(response: unknown): IchTemplate[] {
  if (!Array.isArray(response)) {
    throw new Error('Template list response must be an array');
  }
  return response as IchTemplate[];
}

function assertImportResponse(response: unknown): ImportIchBaselineResponse {
  if (
    typeof response !== 'object' ||
    response === null ||
    !Number.isInteger((response as ImportIchBaselineResponse).seededResources)
  ) {
    throw new Error('Import ICH baseline response is missing seededResources');
  }
  return response as ImportIchBaselineResponse;
}

function ImportIchButton({ onImported }: { onImported: () => Promise<void> }) {
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      const response = await api.post('/templates/import-ich-baseline', null, { timeout: 120000 });
      const result = assertImportResponse(response);
      message.success(`ICH baseline imported from ${result.seededResources} resources`);
      await onImported();
    } catch (error) {
      console.error('Import ICH baseline failed:', error);
      message.error(error instanceof Error ? error.message : 'Import ICH baseline failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Button icon={<UploadOutlined />} loading={importing} onClick={handleImport} type="primary">
      Import ICH baseline
    </Button>
  );
}

export default function TemplateListPage() {
  const [loading, setLoading] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<SpecFilter>('ALL');
  const [templates, setTemplates] = useState<IchTemplate[]>([]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/templates', {
        params:
          selectedSpec === 'ALL'
            ? { version: DEFAULT_VERSION }
            : { spec: selectedSpec, version: DEFAULT_VERSION },
      });
      setTemplates(assertTemplateList(response));
    } catch (error) {
      console.error('Fetch ICH templates failed:', error);
      message.error(error instanceof Error ? error.message : '获取模板列表失败');
    } finally {
      setLoading(false);
    }
  }, [selectedSpec]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const specCounts = useMemo(() => {
    return templates.reduce<Record<string, number>>((counts, template) => {
      return {
        ...counts,
        [template.spec]: (counts[template.spec] || 0) + 1,
      };
    }, {});
  }, [templates]);

  const columns: TableProps<IchTemplate>['columns'] = [
    {
      dataIndex: 'spec',
      key: 'spec',
      render: (spec: string) => <Tag color={SPEC_TAG_COLORS[spec] || 'default'}>{spec}</Tag>,
      title: 'Spec',
      width: 120,
    },
    {
      dataIndex: 'sectionPath',
      key: 'sectionPath',
      title: 'Section',
      width: 140,
    },
    {
      dataIndex: 'title',
      key: 'title',
      render: (title: string | null | undefined, record) => title || record.sectionPath,
      title: 'Title',
      width: 280,
    },
    {
      dataIndex: 'outline',
      ellipsis: { showTitle: false },
      key: 'outline',
      render: (outline: string) => (
        <Tooltip placement="topLeft" title={outline}>
          {outline}
        </Tooltip>
      ),
      title: 'Outline',
    },
    {
      dataIndex: 'version',
      key: 'version',
      title: 'Version',
      width: 120,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-gray-500 mt-2">ICH baseline section templates</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchTemplates}>
            Refresh
          </Button>
          <ImportIchButton onImported={fetchTemplates} />
        </Space>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          onChange={setSelectedSpec}
          options={SPEC_OPTIONS}
          style={{ width: 180 }}
          value={selectedSpec}
        />
        {Object.entries(specCounts).map(([spec, count]) => (
          <Tag color={SPEC_TAG_COLORS[spec] || 'default'} key={spec}>
            {spec}: {count}
          </Tag>
        ))}
      </div>

      <div className="bg-white rounded-lg">
        <Table<IchTemplate>
          columns={columns}
          dataSource={templates}
          loading={loading}
          locale={{
            emptyText: <Empty description="暂无模板" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          rowKey="id"
        />
      </div>
    </div>
  );
}
