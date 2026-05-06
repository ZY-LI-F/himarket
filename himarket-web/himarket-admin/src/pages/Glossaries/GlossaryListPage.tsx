import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { glossariesApi } from '@/api/glossaries';
import type { GlossaryEntry, GlossaryScope } from '@/api/glossaries';

const SCOPE_OPTIONS: Array<{ label: string; value: GlossaryScope | 'all' }> = [
  { label: '全部', value: 'all' },
  { label: '全局', value: 'global' },
  { label: '团队', value: 'team' },
];

const SCOPE_LABELS: Record<GlossaryScope, string> = {
  global: '全局',
  team: '团队',
  user: '用户',
};

const SCOPE_COLOR: Record<GlossaryScope, string> = {
  global: 'blue',
  team: 'cyan',
  user: 'gold',
};

const DOMAIN_OPTIONS = [
  { label: '肿瘤学', value: 'oncology' },
  { label: '心血管', value: 'cardiology' },
  { label: '法规事务', value: 'regulatory' },
  { label: '统计学', value: 'statistics' },
  { label: '其他', value: 'other' },
];

interface FormValues {
  id?: string;
  scope: GlossaryScope;
  team?: string;
  domain: string;
  term: string;
  preferred: string;
  aliases?: string;
  abbreviation?: string;
  definition?: string;
  enabled: boolean;
}

const toFormValues = (entry?: GlossaryEntry): FormValues => ({
  id: entry?.id,
  scope: entry?.scope ?? 'global',
  team: entry?.teamId,
  domain: entry?.domain ?? 'regulatory',
  term: entry?.term ?? '',
  preferred: entry?.preferred ?? '',
  aliases: entry?.aliases?.join(', '),
  abbreviation: entry?.abbreviation,
  definition: entry?.definition,
  enabled: entry?.enabled ?? true,
});

const fromFormValues = (values: FormValues): Partial<GlossaryEntry> => ({
  scope: values.scope,
  teamId: values.scope === 'team' ? values.team : undefined,
  domain: values.domain,
  term: values.term.trim(),
  preferred: values.preferred.trim(),
  aliases:
    values.aliases
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [],
  abbreviation: values.abbreviation?.trim() || undefined,
  definition: values.definition?.trim() || undefined,
  enabled: values.enabled,
});

const GlossaryListPage = () => {
  const [scope, setScope] = useState<GlossaryScope | 'all'>('all');
  const [domain, setDomain] = useState<string | undefined>();
  const [team, setTeam] = useState<string | undefined>();
  const [data, setData] = useState<GlossaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GlossaryEntry | undefined>();
  const [form] = Form.useForm<FormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await glossariesApi.list({ scope, domain, team });
      setData(res.data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [scope, domain, team]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = useCallback(
    async (values: FormValues) => {
      const payload = fromFormValues(values);
      try {
        if (editing) {
          await glossariesApi.update(editing.id, payload);
          message.success('已更新');
        } else {
          await glossariesApi.create(payload);
          message.success('已创建');
        }
        setModalOpen(false);
        setEditing(undefined);
        form.resetFields();
        void load();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '保存失败';
        message.error(msg);
      }
    },
    [editing, form, load],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await glossariesApi.delete(id);
        message.success('已删除');
        void load();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '删除失败';
        message.error(msg);
      }
    },
    [load],
  );

  const openCreate = () => {
    setEditing(undefined);
    form.setFieldsValue(toFormValues());
    setModalOpen(true);
  };

  const openEdit = (entry: GlossaryEntry) => {
    setEditing(entry);
    form.setFieldsValue(toFormValues(entry));
    setModalOpen(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          options={SCOPE_OPTIONS}
          style={{ width: 120 }}
          value={scope}
          onChange={(v) => setScope(v)}
        />
        <Select
          allowClear
          options={DOMAIN_OPTIONS}
          placeholder="按 domain 过滤"
          style={{ width: 160 }}
          value={domain}
          onChange={(v) => setDomain(v)}
        />
        {scope === 'team' && (
          <Input
            allowClear
            placeholder="team id"
            style={{ width: 160 }}
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            onPressEnter={() => void load()}
          />
        )}
        <Button icon={<PlusOutlined />} type="primary" onClick={openCreate}>
          新建术语
        </Button>
      </Space>

      {error && <Alert closable showIcon message={error} style={{ marginBottom: 16 }} type="error" />}

      <Table
        columns={[
          { dataIndex: 'term', key: 'term', title: '术语', width: 200 },
          { dataIndex: 'preferred', key: 'preferred', title: '首选写法', width: 200 },
          { dataIndex: 'abbreviation', key: 'abbreviation', title: '缩写', width: 100 },
          { dataIndex: 'domain', key: 'domain', title: 'Domain', width: 120 },
          {
            dataIndex: 'aliases',
            key: 'aliases',
            render: (aliases?: string[]) => aliases?.join(', ') || '-',
            title: '别名',
            width: 200,
          },
          {
            dataIndex: 'scope',
            key: 'scope',
            render: (s: GlossaryScope) => <Tag color={SCOPE_COLOR[s]}>{SCOPE_LABELS[s]}</Tag>,
            title: 'Scope',
            width: 90,
          },
          {
            dataIndex: 'enabled',
            key: 'enabled',
            render: (enabled?: boolean) => (
              <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag>
            ),
            title: '状态',
            width: 80,
          },
          {
            key: 'actions',
            render: (_: unknown, record: GlossaryEntry) => (
              <Space>
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  type="link"
                  onClick={() => openEdit(record)}
                >
                  编辑
                </Button>
                <Popconfirm
                  cancelText="取消"
                  okText="删除"
                  title="确认删除该术语?"
                  onConfirm={() => void handleDelete(record.id)}
                >
                  <Button danger icon={<DeleteOutlined />} size="small" type="link">
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
            title: '操作',
            width: 160,
          },
        ]}
        dataSource={data}
        loading={loading}
        rowKey="id"
      />

      <Modal
        cancelText="取消"
        destroyOnClose
        okText="保存"
        open={modalOpen}
        title={editing ? '编辑术语' : '新建术语'}
        width={640}
        onCancel={() => {
          setModalOpen(false);
          setEditing(undefined);
          form.resetFields();
        }}
        onOk={() => void form.submit()}
      >
        <Form
          form={form}
          initialValues={toFormValues()}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          onFinish={handleSave}
        >
          <Form.Item label="Scope" name="scope" rules={[{ required: true }]}>
            <Select
              options={SCOPE_OPTIONS.filter((o) => o.value !== 'all') as Array<{
                label: string;
                value: GlossaryScope;
              }>}
            />
          </Form.Item>
          <Form.Item dependencies={['scope']} noStyle>
            {({ getFieldValue }) =>
              getFieldValue('scope') === 'team' ? (
                <Form.Item label="Team" name="team" rules={[{ required: true }]}>
                  <Input placeholder="team id, 例如 docclair" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item label="Domain" name="domain" rules={[{ required: true }]}>
            <Select options={DOMAIN_OPTIONS} />
          </Form.Item>
          <Form.Item label="术语" name="term" rules={[{ required: true }]}>
            <Input placeholder="例如 NSCLC" />
          </Form.Item>
          <Form.Item label="首选写法" name="preferred" rules={[{ required: true }]}>
            <Input placeholder="non-small cell lung cancer" />
          </Form.Item>
          <Form.Item label="别名" name="aliases" tooltip="多个用逗号分隔">
            <Input placeholder="non small cell lung carcinoma, NSCLC" />
          </Form.Item>
          <Form.Item label="缩写" name="abbreviation">
            <Input placeholder="NSCLC" />
          </Form.Item>
          <Form.Item label="定义" name="definition">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item initialValue label="启用" name="enabled" valuePropName="checked">
            <input style={{ marginLeft: 8 }} type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GlossaryListPage;
