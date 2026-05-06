import { Alert, Card, Empty, Spin, Tabs, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import api from '../lib/api';

interface Project {
  id: string;
  title: string;
  category: string;
  ichSpec?: string;
  status: string;
  direction?: Record<string, unknown>;
}

interface Draft {
  section: string;
  title?: string;
  body?: string;
  version?: number;
  status?: string;
}

const ProjectWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | undefined>();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(undefined);
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/drafts`),
    ])
      .then(([pRes, dRes]) => {
        setProject(pRes?.data?.data ?? pRes?.data);
        const draftsPayload = dRes?.data?.data ?? dRes?.data ?? [];
        setDrafts(Array.isArray(draftsPayload) ? draftsPayload : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) return <Empty description="缺少项目 id" />;

  return (
    <div style={{ maxWidth: 1440, margin: '24px auto', padding: '0 24px' }}>
      <Spin spinning={loading}>
        {error && (
          <Alert closable message={error} showIcon style={{ marginBottom: 16 }} type="error" />
        )}
        {project && (
          <Card style={{ marginBottom: 16 }}>
            <h1>{project.title}</h1>
            <p>
              <Tag color="blue">{project.category}</Tag>
              {project.ichSpec && <Tag color="purple">{project.ichSpec}</Tag>}
              <Tag>{project.status}</Tag>
            </p>
            {project.direction && (
              <pre style={{ background: '#f5f5f5', padding: 12, fontSize: 12 }}>
                {JSON.stringify(project.direction, null, 2)}
              </pre>
            )}
          </Card>
        )}
        <Tabs
          items={[
            {
              children: drafts.length === 0 ? (
                <Empty description="尚未生成草稿；等待 worker 完成派发任务" />
              ) : (
                <div>
                  {drafts.map((d) => (
                    <Card key={d.section} size="small" style={{ marginBottom: 12 }} title={`${d.section} ${d.title ?? ''}`}>
                      <pre style={{ whiteSpace: 'pre-wrap' }}>{d.body ?? '(空)'}</pre>
                    </Card>
                  ))}
                </div>
              ),
              key: 'drafts',
              label: '章节草稿',
            },
            {
              children: <Empty description="Timeline / Attachments 在此 stub 暂未实现" />,
              key: 'timeline',
              label: 'Timeline',
            },
            {
              children: <Empty description="Attachments 列表在此 stub 暂未实现" />,
              key: 'attachments',
              label: '附件',
            },
          ]}
        />
      </Spin>
    </div>
  );
};

export default ProjectWorkspace;
