import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Modal, Space, Spin, Tabs, Tag, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import api from '../lib/api';

interface Project {
  id: string;
  title: string;
  spec: string;
  version: string;
  status: string;
  prompt?: string;
  roomId?: string;
  teamTemplateId?: string;
  lastTaskId?: string;
  lastDispatchedAt?: string;
}

interface Chapter {
  id: string;
  title: string;
  prompt?: string;
  status?: string;
  content?: string;
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  dispatched: 'blue',
  regenerating: 'orange',
  assembled: 'green',
};

const ProjectWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | undefined>();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [regenerating, setRegenerating] = useState<string | undefined>();
  const [assembling, setAssembling] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(undefined);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/chapters`),
      ]);
      setProject(pRes?.data?.data ?? pRes?.data);
      const chs = cRes?.data?.data ?? cRes?.data ?? [];
      setChapters(Array.isArray(chs) ? chs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRegenerate = (chapterId: string, chapterTitle: string) => {
    if (!id) return;
    Modal.confirm({
      cancelText: '取消',
      content: `确认让 worker 重新生成章节 ${chapterTitle} 的草稿？现有内容会被覆盖。`,
      okText: '重新生成',
      title: '重新生成草稿',
      onOk: async () => {
        setRegenerating(chapterId);
        try {
          await api.post(`/projects/${id}/_regenerate`, {
            chapterId,
            prompt: `Regenerate chapter ${chapterTitle}`,
          });
          message.success(`已请求重新生成 ${chapterTitle}`);
          await refresh();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '请求失败');
        } finally {
          setRegenerating(undefined);
        }
      },
    });
  };

  const handleAssemble = async () => {
    if (!id) return;
    setAssembling(true);
    try {
      await api.post(`/projects/${id}/_assemble`);
      message.success('已组装文档');
      await refresh();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '组装失败');
    } finally {
      setAssembling(false);
    }
  };

  if (!id) return <Empty description="缺少项目 id" />;

  return (
    <div style={{ maxWidth: 1440, margin: '24px auto', padding: '0 24px' }}>
      <Spin spinning={loading}>
        {error && <Alert closable message={error} showIcon style={{ marginBottom: 16 }} type="error" />}
        {project && (
          <Card
            extra={
              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
                  刷新
                </Button>
                <Button loading={assembling} type="primary" onClick={() => void handleAssemble()}>
                  组装文档
                </Button>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <h1>{project.title}</h1>
            <Space>
              <Tag color="purple">{project.spec}</Tag>
              <Tag>{project.version}</Tag>
              <Tag color={STATUS_COLOR[project.status] ?? 'default'}>{project.status}</Tag>
              {project.roomId && <Tag color="blue">room: {project.roomId}</Tag>}
              {project.teamTemplateId && <Tag color="cyan">tmpl: {project.teamTemplateId}</Tag>}
            </Space>
            {project.lastTaskId && (
              <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                last task: {project.lastTaskId}
                {project.lastDispatchedAt && ` @ ${project.lastDispatchedAt.replace('T', ' ').slice(0, 19)}`}
              </div>
            )}
            {project.prompt && (
              <pre style={{ background: '#f5f5f5', fontSize: 12, marginTop: 12, padding: 12, maxHeight: 200, overflow: 'auto' }}>
                {project.prompt}
              </pre>
            )}
          </Card>
        )}
        <Tabs
          items={[
            {
              children:
                chapters.length === 0 ? (
                  <Empty description="项目无章节；新建项目时未选择 ICH 模板" />
                ) : (
                  <div>
                    {chapters.map((c) => (
                      <Card
                        extra={
                          <Button
                            loading={regenerating === c.id}
                            size="small"
                            onClick={() => handleRegenerate(c.id, c.title)}
                          >
                            重新生成
                          </Button>
                        }
                        key={c.id}
                        size="small"
                        style={{ marginBottom: 12 }}
                        title={
                          <Space>
                            <span>{c.id}</span>
                            <span style={{ color: '#666' }}>{c.title}</span>
                            {c.status && <Tag color={STATUS_COLOR[c.status] ?? 'default'}>{c.status}</Tag>}
                          </Space>
                        }
                      >
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.content ?? '(尚未生成)'}</pre>
                        {c.prompt && (
                          <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                            prompt: {c.prompt}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ),
              key: 'chapters',
              label: `章节（${chapters.length}）`,
            },
          ]}
        />
      </Spin>
    </div>
  );
};

export default ProjectWorkspace;
