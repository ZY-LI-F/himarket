import { ArrowLeftOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Space, Spin, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { knowledgeApi } from '@/api/knowledge';
import type { KnowledgeAsset, KnowledgeSchemaResponse } from '@/api/knowledge';
import RjsfYamlTabs from '@/components/RjsfYamlTabs';
import type { JsonObject } from '@/components/RjsfYamlTabs';

import {
  DEFAULT_KNOWLEDGE_CATEGORY,
  DEFAULT_KNOWLEDGE_KIND,
  toKnowledgeFormData,
} from './knowledgeForm';

import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { DescriptionsProps } from 'antd';

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '-';
  }

  return value.replace('T', ' ').slice(0, 19);
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export default function KnowledgeDetailPage() {
  const navigate = useNavigate();
  const { knowledgeId } = useParams<{ knowledgeId: string }>();
  const [asset, setAsset] = useState<KnowledgeAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [schemaResponse, setSchemaResponse] = useState<KnowledgeSchemaResponse | null>(null);

  const fetchKnowledgeAsset = useCallback(async () => {
    if (!knowledgeId) {
      throw new Error('缺少知识资产 ID');
    }

    setError(null);
    setLoading(true);

    try {
      const [assetResponse, schemaResult] = await Promise.all([
        knowledgeApi.getKnowledgeAsset(knowledgeId),
        knowledgeApi.getKnowledgeSchema({
          category: DEFAULT_KNOWLEDGE_CATEGORY,
          kind: DEFAULT_KNOWLEDGE_KIND,
        }),
      ]);
      setAsset(assetResponse.data);
      setSchemaResponse(schemaResult.data);
    } catch (fetchError) {
      console.error('加载知识资产失败:', fetchError);
      setError(getErrorMessage(fetchError, '知识资产加载失败'));
    } finally {
      setLoading(false);
    }
  }, [knowledgeId]);

  useEffect(() => {
    void fetchKnowledgeAsset();
  }, [fetchKnowledgeAsset]);

  const detailItems = useMemo<DescriptionsProps['items']>(() => {
    if (!asset) {
      return [];
    }

    return [
      {
        children: asset.name,
        key: 'name',
        label: '名称',
      },
      {
        children: <Tag color="blue">{asset.scope}</Tag>,
        key: 'scope',
        label: '范围',
      },
      {
        children: asset.kind,
        key: 'kind',
        label: '类型',
      },
      {
        children: asset.category,
        key: 'category',
        label: '分类',
      },
      {
        children: asset.enabled ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>,
        key: 'enabled',
        label: '状态',
      },
      {
        children: asset.syncPending ? (
          <Tag color="orange">待同步</Tag>
        ) : (
          <Tag color="green">已同步</Tag>
        ),
        key: 'syncPending',
        label: '同步状态',
      },
      {
        children: asset.severity || '-',
        key: 'severity',
        label: '严重级别',
      },
      {
        children: asset.domain || '-',
        key: 'domain',
        label: '领域',
      },
      {
        children: asset.version ?? '-',
        key: 'version',
        label: '版本',
      },
      {
        children: asset.etag || '-',
        key: 'etag',
        label: 'Etag',
      },
      {
        children: formatDateTime(asset.updatedAt),
        key: 'updatedAt',
        label: '更新时间',
      },
      {
        children: asset.description || '-',
        key: 'description',
        label: '描述',
        span: 3,
      },
    ];
  }, [asset]);

  const formData = useMemo<JsonObject>(() => (asset ? toKnowledgeFormData(asset) : {}), [asset]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/admin/knowledge')}
            type="link"
          >
            返回知识库
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{asset?.name ?? '知识资产详情'}</h1>
            <p className="mt-2 text-gray-500">查看知识资产表单数据与 YAML 表达</p>
          </div>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void fetchKnowledgeAsset()}
          >
            刷新
          </Button>
          {knowledgeId && (
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/knowledge/${knowledgeId}/edit`)}
              type="primary"
            >
              编辑
            </Button>
          )}
        </Space>
      </div>

      {error && <Alert message={error} showIcon type="error" />}

      <Spin spinning={loading}>
        {asset && schemaResponse && (
          <div className="space-y-4">
            <Descriptions bordered column={3} items={detailItems} />
            <RjsfYamlTabs
              readonly
              schema={schemaResponse.schema as RJSFSchema}
              uiSchema={schemaResponse.uiSchema as UiSchema}
              value={formData}
            />
          </div>
        )}
      </Spin>
    </div>
  );
}
