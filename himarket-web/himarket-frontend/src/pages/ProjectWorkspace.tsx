import { LinkOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Modal, Space, Spin, Tabs, Tag, Timeline, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
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
  updatedAt?: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  message: string;
  actor?: string;
  createdAt?: string;
}

interface Attachment {
  id: string;
  filename: string;
  category: string;
  sizeBytes: number;
  uploadedAt?: string;
  pubmedId?: string;
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  in_progress: 'blue',
  review: 'orange',
  done: 'green',
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const ProjectWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | undefined>();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [regenerating, setRegenerating] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(undefined);
    try {
      const [pRes, dRes, tRes, aRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/drafts`),
        api.get(`/projects/${id}/timeline`).catch(() => ({ data: [] })),
        api.get('/attachments', { params: { scope: 'project', scopeRef: id } }).catch(() => ({ data: [] })),
      ]);
      setProject(pRes?.data?.data ?? pRes?.data);
      const drafts = dRes?.data?.data ?? dRes?.data ?? [];
      setDrafts(Array.isArray(drafts) ? drafts : []);
      const events = tRes?.data?.data ?? tRes?.data ?? [];
      setEvents(Array.isArray(events) ? events : []);
      const atts = aRes?.data?.data ?? aRes?.data ?? [];
      setAttachments(Array.isArray(atts) ? atts : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRegenerate = async (section: string) => {
    if (!id) return;
    Modal.confirm({
      cancelText: '取消',
      content: `确认让 worker 重新生成章节 ${section} 的草稿？现有内容会被覆盖。`,
      okText: '重新生成',
      title: '重新生成草稿',
      onOk: async () => {
        setRegenerating(section);
        try {
          await api.post(`/projects/${id}/drafts/${encodeURIComponent(section)}/_regenerate`);
          message.success(`已请求重新生成 ${section}`);
          await refresh();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '请求失败');
        } finally {
          setRegenerating(undefined);
        }
      },
    });
  };

  const handleDownloadAttachment = (attId: string) => {
    window.open(`/api/v1/attachments/${attId}/download`, '_blank');
  };

  if (!id) return <Empty description="缺少项目 id" />;

  return (
    <div style={{ maxWidth: 1440, margin: '24px auto', padding: '0 24px' }}>
      <Spin spinning={loading}>
        {error && <Alert closable message={error} showIcon style={{ marginBottom: 16 }} type="error" />}
        {project && (
          <Card
            extra={
              <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
                刷新
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            <h1>{project.title}</h1>
            <Space>
              <Tag color="blue">{project.category}</Tag>
              {project.ichSpec && <Tag color="purple">{project.ichSpec}</Tag>}
              <Tag color={STATUS_COLOR[project.status] ?? 'default'}>{project.status}</Tag>
            </Space>
            {project.direction && (
              <pre style={{ background: '#f5f5f5', fontSize: 12, marginTop: 12, padding: 12 }}>
                {JSON.stringify(project.direction, null, 2)}
              </pre>
            )}
          </Card>
        )}
        <Tabs
          items={[
            {
              children:
                drafts.length === 0 ? (
                  <Empty description="尚未生成草稿；等待 worker 完成派发任务后会出现章节列表" />
                ) : (
                  <div>
                    {drafts.map((d) => (
                      <Card
                        extra={
                          <Button
                            loading={regenerating === d.section}
                            size="small"
                            onClick={() => void handleRegenerate(d.section)}
                          >
                            重新生成
                          </Button>
                        }
                        key={d.section}
                        size="small"
                        style={{ marginBottom: 12 }}
                        title={
                          <Space>
                            <span>{d.section}</span>
                            {d.title && <span style={{ color: '#666' }}>{d.title}</span>}
                            {d.status && <Tag color={STATUS_COLOR[d.status] ?? 'default'}>{d.status}</Tag>}
                            {d.version != null && <Tag>v{d.version}</Tag>}
                          </Space>
                        }
                      >
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{d.body ?? '(空)'}</pre>
                        {d.updatedAt && (
                          <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                            更新于 {d.updatedAt.replace('T', ' ').slice(0, 19)}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ),
              key: 'drafts',
              label: `章节草稿（${drafts.length}）`,
            },
            {
              children:
                events.length === 0 ? (
                  <Empty description="暂无事件" />
                ) : (
                  <Timeline
                    items={events.map((e) => ({
                      children: (
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            <Tag>{e.type}</Tag> {e.message}
                          </div>
                          <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                            {e.actor && <span>by {e.actor} · </span>}
                            {e.createdAt?.replace('T', ' ').slice(0, 19)}
                          </div>
                        </div>
                      ),
                      key: e.id,
                    }))}
                  />
                ),
              key: 'timeline',
              label: `Timeline（${events.length}）`,
            },
            {
              children:
                attachments.length === 0 ? (
                  <Empty description="无关联附件" />
                ) : (
                  <div>
                    {attachments.map((a) => (
                      <Card
                        extra={
                          <Button
                            icon={<LinkOutlined />}
                            size="small"
                            type="link"
                            onClick={() => handleDownloadAttachment(a.id)}
                          >
                            下载
                          </Button>
                        }
                        key={a.id}
                        size="small"
                        style={{ marginBottom: 8 }}
                      >
                        <div>
                          <strong>{a.filename}</strong>
                          {a.pubmedId && <Tag color="purple" style={{ marginLeft: 8 }}>PMID {a.pubmedId}</Tag>}
                        </div>
                        <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                          <Tag>{a.category}</Tag>
                          {formatSize(a.sizeBytes)}
                          {a.uploadedAt && ` · ${a.uploadedAt.slice(0, 10)}`}
                        </div>
                      </Card>
                    ))}
                  </div>
                ),
              key: 'attachments',
              label: `附件（${attachments.length}）`,
            },
          ]}
        />
      </Spin>
    </div>
  );
};

export default ProjectWorkspace;
