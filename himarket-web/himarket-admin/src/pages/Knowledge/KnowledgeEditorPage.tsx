import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Space, Spin, Tag, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { knowledgeApi } from '@/api/knowledge';
import type { KnowledgeAsset, KnowledgeSchemaResponse } from '@/api/knowledge';
import RjsfYamlTabs from '@/components/RjsfYamlTabs';
import type { JsonObject } from '@/components/RjsfYamlTabs';

import {
  DEFAULT_KNOWLEDGE_CATEGORY,
  DEFAULT_KNOWLEDGE_KIND,
  createDefaultKnowledgeFormData,
  toKnowledgeFormData,
  toKnowledgeSaveRequest,
} from './knowledgeForm';

import type { RJSFSchema, UiSchema } from '@rjsf/utils';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export default function KnowledgeEditorPage() {
  const navigate = useNavigate();
  const { knowledgeId } = useParams<{ knowledgeId: string }>();
  const editing = Boolean(knowledgeId);
  const [asset, setAsset] = useState<KnowledgeAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<JsonObject>(() => createDefaultKnowledgeFormData());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schemaResponse, setSchemaResponse] = useState<KnowledgeSchemaResponse | null>(null);
  const [yamlError, setYamlError] = useState<string | null>(null);

  const fetchEditorData = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const schemaResult = await knowledgeApi.getKnowledgeSchema({
        category: DEFAULT_KNOWLEDGE_CATEGORY,
        kind: DEFAULT_KNOWLEDGE_KIND,
      });
      setSchemaResponse(schemaResult.data);

      if (!editing) {
        setAsset(null);
        setFormData(createDefaultKnowledgeFormData());
        return;
      }

      if (!knowledgeId) {
        throw new Error('缺少知识资产 ID');
      }

      const assetResponse = await knowledgeApi.getKnowledgeAsset(knowledgeId);
      setAsset(assetResponse.data);
      setFormData(toKnowledgeFormData(assetResponse.data));
    } catch (fetchError) {
      console.error('加载知识编辑器失败:', fetchError);
      setError(getErrorMessage(fetchError, '知识编辑器加载失败'));
    } finally {
      setLoading(false);
    }
  }, [editing, knowledgeId]);

  useEffect(() => {
    void fetchEditorData();
  }, [fetchEditorData]);

  const handleSave = async () => {
    if (yamlError) {
      message.error('请先修复 YAML 语法错误');
      return;
    }

    setSaving(true);
    try {
      const request = toKnowledgeSaveRequest(formData);
      const response =
        editing && knowledgeId
          ? await updateKnowledgeAsset(knowledgeId, request)
          : await knowledgeApi.createKnowledgeAsset(request);
      message.success('知识资产已保存');
      navigate(`/admin/knowledge/${response.data.id}`);
    } catch (saveError) {
      console.error('保存知识资产失败:', saveError);
      message.error(getErrorMessage(saveError, '知识资产保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const updateKnowledgeAsset = async (
    id: string,
    request: ReturnType<typeof toKnowledgeSaveRequest>,
  ) => {
    const etag = asset?.etag;
    if (!etag) {
      throw new Error('缺少 etag，无法执行并发校验保存');
    }

    return knowledgeApi.updateKnowledgeAsset(id, request, etag);
  };

  const title = editing ? (asset?.name ?? '编辑知识资产') : '新建知识资产';

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
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-gray-500">在表单与 YAML 之间双向编辑知识资产</p>
          </div>
        </div>
        <Space>
          {asset?.etag && <Tag>Etag: {asset.etag}</Tag>}
          <Button icon={<SaveOutlined />} loading={saving} onClick={handleSave} type="primary">
            保存
          </Button>
        </Space>
      </div>

      {error && <Alert message={error} showIcon type="error" />}

      <Spin spinning={loading}>
        {schemaResponse && (
          <RjsfYamlTabs
            disabled={saving}
            onChange={setFormData}
            onYamlErrorChange={setYamlError}
            schema={schemaResponse.schema as RJSFSchema}
            uiSchema={schemaResponse.uiSchema as UiSchema}
            value={formData}
          />
        )}
      </Spin>
    </div>
  );
}
