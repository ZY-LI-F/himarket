import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Space, Spin, Table, Tag } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../lib/api';

interface Project {
  id: string;
  title: string;
  category: 'csr_authoring' | 'csr_review' | 'protocol_authoring';
  ichSpec?: string;
  status: 'draft' | 'in_progress' | 'review' | 'done';
  createdAt?: string;
  updatedAt?: string;
}

const STATUS_COLOR: Record<Project['status'], string> = {
  draft: 'default',
  in_progress: 'blue',
  review: 'orange',
  done: 'green',
};

const STATUS_LABEL: Record<Project['status'], string> = {
  draft: '草稿',
  in_progress: '进行中',
  review: '审阅中',
  done: '已完成',
};

const CATEGORY_LABEL: Record<Project['category'], string> = {
  csr_authoring: 'CSR 写作',
  csr_review: 'CSR 校验',
  protocol_authoring: 'Protocol 写作',
};

const Projects = () => {
  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await api.get('/projects');
      const payload = res?.data?.data ?? res?.data ?? [];
      setData(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ maxWidth: 1280, margin: '24px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: 16 }}>我的撰写项目</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        管理 CSR / Protocol 写作项目；项目派发后由 docclair / csr-team / protocol-team 协作撰写。
      </p>

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} type="primary">
          <Link to="/me/projects/new">新建项目</Link>
        </Button>
      </Space>

      {error && <Alert closable message={error} showIcon style={{ marginBottom: 16 }} type="error" />}

      <Spin spinning={loading}>
        {data.length === 0 && !loading ? (
          <Empty description="暂无项目" />
        ) : (
          <Table<Project>
            columns={[
              {
                dataIndex: 'title',
                key: 'title',
                render: (title: string, r: Project) => <Link to={`/me/projects/${r.id}`}>{title}</Link>,
                title: '项目名称',
              },
              {
                dataIndex: 'category',
                key: 'category',
                render: (c: Project['category']) => <Tag color="blue">{CATEGORY_LABEL[c]}</Tag>,
                title: '类型',
                width: 140,
              },
              {
                dataIndex: 'ichSpec',
                key: 'ichSpec',
                render: (s?: string) => s || '-',
                title: 'ICH spec',
                width: 120,
              },
              {
                dataIndex: 'status',
                key: 'status',
                render: (s: Project['status']) => (
                  <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>
                ),
                title: '状态',
                width: 100,
              },
              {
                dataIndex: 'updatedAt',
                key: 'updatedAt',
                render: (v?: string) => v?.slice(0, 19).replace('T', ' ') || '-',
                title: '更新时间',
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

export default Projects;
