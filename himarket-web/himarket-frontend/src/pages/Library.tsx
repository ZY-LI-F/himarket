import { DeleteOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Popconfirm, Select, Space, Spin, Table, Tag, Upload, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import api from '../lib/api';

interface Attachment {
  id: string;
  filename: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  tags?: string[];
  description?: string;
  uploadedAt?: string;
}

const CATEGORY_OPTIONS = [
  { label: '全部', value: undefined },
  { label: '参考 PDF', value: 'reference_pdf' },
  { label: '历史 CSR', value: 'past_csr' },
  { label: '研究方案', value: 'protocol_doc' },
  { label: '数据集', value: 'dataset' },
  { label: '指南文件', value: 'guideline' },
  { label: '模板', value: 'template_doc' },
  { label: '其他', value: 'other' },
];

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const Library = () => {
  const [category, setCategory] = useState<string | undefined>();
  const [data, setData] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await api.get('/attachments', { params: { scope: 'user', category } });
      const payload = res?.data?.data ?? res?.data ?? [];
      setData(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('scope', 'user');
      fd.append('category', category ?? 'other');
      await api.post('/attachments/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('上传成功');
      void load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/attachments/${id}`);
      message.success('已删除');
      void load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/v1/attachments/${id}/download`, '_blank');
  };

  return (
    <div style={{ maxWidth: 1280, margin: '24px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: 16 }}>我的附件库</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        管理参考文件 / 历史 CSR / 研究方案等附件，供 worker 在 CSR / Protocol 写作时引用。
      </p>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          options={CATEGORY_OPTIONS}
          placeholder="按 category 过滤"
          style={{ width: 160 }}
          value={category}
          onChange={(v) => setCategory(v)}
        />
        <Upload beforeUpload={handleUpload} showUploadList={false}>
          <Button icon={<UploadOutlined />} loading={uploading} type="primary">
            上传附件
          </Button>
        </Upload>
      </Space>

      {error && <Alert closable message={error} showIcon style={{ marginBottom: 16 }} type="error" />}

      <Spin spinning={loading}>
        <Table<Attachment>
          columns={[
            { dataIndex: 'filename', key: 'filename', title: '文件名', width: 240 },
            { dataIndex: 'category', key: 'category', render: (c: string) => <Tag>{c}</Tag>, title: 'Category', width: 140 },
            { dataIndex: 'mimeType', key: 'mimeType', title: 'MIME', width: 200 },
            { dataIndex: 'sizeBytes', key: 'sizeBytes', render: (s: number) => formatSize(s), title: '大小', width: 100 },
            {
              dataIndex: 'tags',
              key: 'tags',
              render: (tags?: string[]) => tags?.map((t) => <Tag key={t}>{t}</Tag>),
              title: '标签',
            },
            {
              dataIndex: 'uploadedAt',
              key: 'uploadedAt',
              render: (v?: string) => v?.slice(0, 19).replace('T', ' ') || '-',
              title: '上传时间',
              width: 160,
            },
            {
              key: 'actions',
              render: (_: unknown, r: Attachment) => (
                <Space>
                  <Button
                    icon={<DownloadOutlined />}
                    size="small"
                    type="link"
                    onClick={() => handleDownload(r.id)}
                  >
                    下载
                  </Button>
                  <Popconfirm
                    cancelText="取消"
                    okText="删除"
                    title="确认删除?"
                    onConfirm={() => handleDelete(r.id)}
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
          rowKey="id"
        />
      </Spin>
    </div>
  );
};

export default Library;
