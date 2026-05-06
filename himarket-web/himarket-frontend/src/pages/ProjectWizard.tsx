import { Alert, Button, Checkbox, Divider, Empty, Form, Input, Select, Space, Spin, Steps, Table, Tag, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PubmedSearchPanel from '../components/PubmedSearchPanel';
import type { PubmedRecord } from '../components/PubmedSearchPanel';
import api from '../lib/api';

const ICH_OPTIONS = [
  { label: 'ICH-E3 (CSR)', value: 'ICH-E3' },
  { label: 'ICH-E6-R3 (GCP)', value: 'ICH-E6-R3' },
  { label: 'ICH-E8-R1 (General)', value: 'ICH-E8-R1' },
  { label: 'ICH-E9 (Statistics)', value: 'ICH-E9' },
];

const CATEGORY_OPTIONS = [
  { label: 'CSR 写作', value: 'csr_authoring' },
  { label: 'CSR 校验', value: 'csr_review' },
  { label: 'Protocol 写作', value: 'protocol_authoring' },
];

interface DirectionForm {
  title: string;
  category: string;
  ichSpec?: string;
  disease?: string;
  drug?: string;
  endpoints?: string;
  studyType?: string;
}

interface IchTemplate {
  id: string;
  spec: string;
  sectionPath: string;
  sectionTitle: string;
  required: boolean;
}

interface AttachmentItem {
  id: string;
  filename: string;
  category: string;
  sizeBytes: number;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const ProjectWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<DirectionForm | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<DirectionForm>();

  // step 2: ICH templates
  const [templates, setTemplates] = useState<IchTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  // step 3: attachments
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);

  // step 4: pubmed
  const [pubmedRecords, setPubmedRecords] = useState<PubmedRecord[]>([]);

  // Load ICH templates when entering step 1
  const loadTemplates = useCallback(async () => {
    if (!direction?.ichSpec || !direction?.category) return;
    setTemplatesLoading(true);
    try {
      const res = await api.get('/templates', {
        params: { spec: direction.ichSpec, category: direction.category },
      });
      const payload = res?.data?.data ?? res?.data ?? [];
      setTemplates(Array.isArray(payload) ? payload : []);
      // 默认选中所有 required 章节
      setSelectedSections(payload.filter((t: IchTemplate) => t.required).map((t: IchTemplate) => t.id));
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载模板失败');
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [direction]);

  // Load user attachments when entering step 2
  const loadAttachments = useCallback(async () => {
    setAttachmentsLoading(true);
    try {
      const res = await api.get('/attachments', { params: { scope: 'user' } });
      const payload = res?.data?.data ?? res?.data ?? [];
      setAttachments(Array.isArray(payload) ? payload : []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载附件失败');
    } finally {
      setAttachmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 1) void loadTemplates();
    if (step === 2) void loadAttachments();
  }, [step, loadTemplates, loadAttachments]);

  const handleDirectionNext = (values: DirectionForm) => {
    setDirection(values);
    setStep(1);
  };

  const pubmedDirection = useMemo(
    () => ({
      disease: direction?.disease,
      drug: direction?.drug,
      endpoints: direction?.endpoints
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      studyType: direction?.studyType,
    }),
    [direction],
  );

  const handleSubmit = async () => {
    if (!direction) return;
    setSubmitting(true);
    try {
      // 1. 创建项目
      const createRes = await api.post('/projects', {
        title: direction.title,
        category: direction.category,
        ichSpec: direction.ichSpec,
        direction: {
          disease: direction.disease,
          drug: direction.drug,
          endpoints: pubmedDirection.endpoints ?? [],
          design: { studyType: direction.studyType },
        },
        targetSections: selectedSections,
      });
      const projectId =
        createRes?.data?.data?.id ?? createRes?.data?.id ?? '';

      // 2. attach 附件
      if (projectId && selectedAttachmentIds.length > 0) {
        await api.post(`/projects/${projectId}/attachments/_attach`, {
          attachmentIds: selectedAttachmentIds,
        });
      }

      // 3. attach PubMed records
      if (projectId && pubmedRecords.length > 0) {
        await Promise.all(
          pubmedRecords.map((r) =>
            api.post(`/pubmed/records/${r.pmid}/_attach`, {
              projectId,
              fetchPdf: false,
            }),
          ),
        );
      }

      // 4. 派发
      if (projectId) {
        await api.post(`/projects/${projectId}/dispatch`);
      }

      message.success('项目创建并已派发');
      if (projectId) navigate(`/me/projects/${projectId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 24px' }}>
      <h1>新建撰写项目</h1>
      <Steps
        current={step}
        items={[
          { description: '疾病/药物/终点', title: '撰写方向' },
          { description: 'ICH 章节', title: '选择模板' },
          { description: '从附件库挑选', title: '挂接附件' },
          { description: '可选检索', title: 'PubMed' },
          { description: '派发到 worker', title: '提交' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {step === 0 && (
        <Form
          form={form}
          initialValues={{ category: 'csr_authoring' }}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 16 }}
          onFinish={handleDirectionNext}
        >
          <Form.Item label="项目标题" name="title" rules={[{ required: true }]}>
            <Input placeholder="例如 NSCLC pembrolizumab III 期 CSR" />
          </Form.Item>
          <Form.Item label="项目类型" name="category" rules={[{ required: true }]}>
            <Select options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item label="ICH spec" name="ichSpec">
            <Select allowClear options={ICH_OPTIONS} placeholder="选填" />
          </Form.Item>
          <Form.Item label="疾病" name="disease">
            <Input placeholder="例如 non-small cell lung cancer" />
          </Form.Item>
          <Form.Item label="药物" name="drug">
            <Input placeholder="例如 pembrolizumab" />
          </Form.Item>
          <Form.Item label="终点指标" name="endpoints" tooltip="多个用逗号分隔">
            <Input placeholder="overall survival, progression-free survival" />
          </Form.Item>
          <Form.Item label="研究类型" name="studyType">
            <Input placeholder="例如 randomized controlled trial" />
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 6 }}>
            <Button htmlType="submit" type="primary">
              下一步
            </Button>
          </Form.Item>
        </Form>
      )}

      {step === 1 && (
        <div>
          <Alert
            message={
              direction?.ichSpec
                ? `加载 ${direction.ichSpec} / ${direction.category} 的章节模板`
                : '未选择 ICH spec，跳过此步'
            }
            style={{ marginBottom: 16 }}
            type="info"
          />
          {direction?.ichSpec ? (
            <Spin spinning={templatesLoading}>
              {templates.length === 0 && !templatesLoading ? (
                <Empty description="没有匹配的模板，可继续下一步" />
              ) : (
                <Table<IchTemplate>
                  columns={[
                    { dataIndex: 'sectionPath', key: 'sectionPath', title: 'Section', width: 110 },
                    { dataIndex: 'sectionTitle', key: 'sectionTitle', title: '标题' },
                    {
                      dataIndex: 'required',
                      key: 'required',
                      render: (req: boolean) =>
                        req ? <Tag color="orange">必选</Tag> : <Tag>可选</Tag>,
                      title: '类型',
                      width: 100,
                    },
                  ]}
                  dataSource={templates}
                  pagination={false}
                  rowKey="id"
                  rowSelection={{
                    onChange: (keys) => setSelectedSections(keys as string[]),
                    selectedRowKeys: selectedSections,
                  }}
                  size="small"
                />
              )}
            </Spin>
          ) : null}
          <Divider />
          <Space>
            <Button onClick={() => setStep(0)}>上一步</Button>
            <Button type="primary" onClick={() => setStep(2)}>
              下一步
            </Button>
          </Space>
        </div>
      )}

      {step === 2 && (
        <div>
          <Alert
            message="从你的附件库挑选要给 worker 当作上下文的文件（protocol / past_csr / dataset 等）。"
            style={{ marginBottom: 16 }}
            type="info"
          />
          <Spin spinning={attachmentsLoading}>
            {attachments.length === 0 && !attachmentsLoading ? (
              <Empty description="附件库为空，请先到 /me/library 上传" />
            ) : (
              <Table<AttachmentItem>
                columns={[
                  { dataIndex: 'filename', key: 'filename', title: '文件名' },
                  {
                    dataIndex: 'category',
                    key: 'category',
                    render: (c: string) => <Tag>{c}</Tag>,
                    title: 'Category',
                    width: 140,
                  },
                  {
                    dataIndex: 'sizeBytes',
                    key: 'sizeBytes',
                    render: (s: number) => formatSize(s),
                    title: '大小',
                    width: 100,
                  },
                ]}
                dataSource={attachments}
                pagination={false}
                rowKey="id"
                rowSelection={{
                  onChange: (keys) => setSelectedAttachmentIds(keys as string[]),
                  selectedRowKeys: selectedAttachmentIds,
                }}
                size="small"
              />
            )}
          </Spin>
          <Divider />
          <Space>
            <Button onClick={() => setStep(1)}>上一步</Button>
            <Button type="primary" onClick={() => setStep(3)}>
              下一步
            </Button>
          </Space>
        </div>
      )}

      {step === 3 && (
        <div>
          <Alert
            message="可选：检索 PubMed 文献并挂接到本项目，作为 worker 写作的证据来源。"
            style={{ marginBottom: 16 }}
            type="info"
          />
          <PubmedSearchPanel
            direction={pubmedDirection}
            onAttach={(records) => {
              const merged = [...pubmedRecords];
              records.forEach((r) => {
                if (!merged.find((m) => m.pmid === r.pmid)) merged.push(r);
              });
              setPubmedRecords(merged);
              message.success(`已记录 ${records.length} 篇待挂接（提交时持久化）`);
            }}
          />
          {pubmedRecords.length > 0 && (
            <Alert
              message={`已挑选 ${pubmedRecords.length} 篇 PubMed 文献`}
              style={{ marginTop: 12 }}
              type="success"
            />
          )}
          <Divider />
          <Space>
            <Button onClick={() => setStep(2)}>上一步</Button>
            <Button type="primary" onClick={() => setStep(4)}>
              下一步
            </Button>
          </Space>
        </div>
      )}

      {step === 4 && (
        <div>
          <Alert message="确认信息后提交，项目将派发到对应 worker team。" type="info" />
          <ul style={{ marginTop: 12 }}>
            <li>标题：{direction?.title}</li>
            <li>类型：{direction?.category}</li>
            <li>ICH spec：{direction?.ichSpec ?? '-'}</li>
            <li>疾病/药物：{direction?.disease ?? '-'} / {direction?.drug ?? '-'}</li>
            <li>选中章节数：{selectedSections.length}</li>
            <li>选中附件数：{selectedAttachmentIds.length}</li>
            <li>PubMed 文献数：{pubmedRecords.length}</li>
          </ul>
          <Divider />
          <Space>
            <Button onClick={() => setStep(3)}>上一步</Button>
            <Button loading={submitting} type="primary" onClick={handleSubmit}>
              {submitting ? '创建并派发中...' : '提交并派发'}
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default ProjectWizard;
