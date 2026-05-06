import { Alert, Button, Empty, Space, Spin, Table, Tag, Tabs } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../lib/api';

interface KnowledgeAsset {
  id: string;
  category: string;
  name: string;
  scope: 'global' | 'team' | 'user';
  severity?: string;
  enabled?: boolean;
  description?: string;
  inheritsFrom?: string;
  updatedAt?: string;
}

const CATEGORY_TABS = [
  { key: 'doc_review', label: 'docx 校验' },
  { key: 'csr_review', label: 'CSR 校验' },
  { key: 'csr_authoring', label: 'CSR 写作' },
  { key: 'protocol_authoring', label: 'Protocol 写作' },
];

const MyKnowledge = () => {
  const [activeCategory, setActiveCategory] = useState('doc_review');
  const [data, setData] = useState<KnowledgeAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await api.get('/me/knowledge', { params: { category: activeCategory } });
      const payload = res?.data?.data ?? res?.data ?? [];
      setData(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ maxWidth: 1280, margin: '24px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: 16 }}>我的规则</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        管理 user-scope 规则，可继承 team / global baseline 并覆盖 severity / enabled 字段。
      </p>

      <Tabs
        activeKey={activeCategory}
        items={CATEGORY_TABS.map((t) => ({ key: t.key, label: t.label }))}
        onChange={(key) => setActiveCategory(key)}
      />

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary">
          <Link to={`/me/knowledge/new?category=${activeCategory}`}>新建规则</Link>
        </Button>
      </Space>

      {error && <Alert closable message={error} showIcon style={{ marginBottom: 16 }} type="error" />}

      <Spin spinning={loading}>
        {data.length === 0 && !loading ? (
          <Empty description="暂无 user-scope 规则" />
        ) : (
          <Table<KnowledgeAsset>
            columns={[
              { dataIndex: 'name', key: 'name', title: '名称', width: 220 },
              {
                dataIndex: 'severity',
                key: 'severity',
                render: (s?: string) => (s ? <Tag color="orange">{s}</Tag> : '-'),
                title: '严重度',
                width: 100,
              },
              {
                dataIndex: 'enabled',
                key: 'enabled',
                render: (e?: boolean) => (
                  <Tag color={e ? 'green' : 'default'}>{e ? '启用' : '停用'}</Tag>
                ),
                title: '状态',
                width: 80,
              },
              { dataIndex: 'description', key: 'description', title: '描述', ellipsis: true },
              {
                dataIndex: 'inheritsFrom',
                key: 'inheritsFrom',
                render: (v?: string) => v || '-',
                title: '继承自',
                width: 160,
              },
            ]}
            dataSource={data}
            rowKey="id"
          />
        )}
      </Spin>
    </div>
  );
};

export default MyKnowledge;
