import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Space, Spin, Table, Tag, Upload, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import api from '../lib/api';

interface AttachmentSummary {
  attachmentId: string;
  name: string;
  contentType: string;
  size: number;
  sha256: string;
  createdAt?: string;
}

interface SignedUrlResponse {
  attachmentId: string;
  signedUrl: string;
  signedUrlTtlSeconds: number;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const Library = () => {
  const [data, setData] = useState<AttachmentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await api.get('/attachments');
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

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/attachments', fd, {
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

  const handleDownload = async (attachmentId: string) => {
    try {
      const res = await api.get(`/attachments/${attachmentId}/signed-url`);
      const payload = (res?.data?.data ?? res?.data) as SignedUrlResponse | undefined;
      if (payload?.signedUrl) {
        window.open(payload.signedUrl, '_blank');
      } else {
        message.error('未拿到下载链接');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '下载失败');
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '24px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: 16 }}>我的附件库</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        上传参考文件 / 历史 CSR / 研究方案等附件，供 worker 在 CSR / Protocol 写作时引用。当前为
        v1 共享视图（按 owner 过滤待 v2 完善）。
      </p>

      <Space style={{ marginBottom: 16 }} wrap>
        <Upload beforeUpload={handleUpload} showUploadList={false}>
          <Button icon={<UploadOutlined />} loading={uploading} type="primary">
            上传附件
          </Button>
        </Upload>
      </Space>

      {error && <Alert closable message={error} showIcon style={{ marginBottom: 16 }} type="error" />}

      <Spin spinning={loading}>
        <Table<AttachmentSummary>
          columns={[
            { dataIndex: 'name', key: 'name', title: '文件名', width: 280 },
            {
              dataIndex: 'contentType',
              key: 'contentType',
              render: (c: string) => <Tag>{c}</Tag>,
              title: 'MIME',
              width: 200,
            },
            {
              dataIndex: 'size',
              key: 'size',
              render: (s: number) => formatSize(s),
              title: '大小',
              width: 100,
            },
            {
              dataIndex: 'sha256',
              key: 'sha256',
              render: (v: string) => <code>{v?.slice(0, 12)}…</code>,
              title: 'sha256',
              width: 140,
            },
            {
              dataIndex: 'createdAt',
              key: 'createdAt',
              render: (v?: string) => v?.slice(0, 19).replace('T', ' ') || '-',
              title: '上传时间',
              width: 180,
            },
            {
              key: 'actions',
              render: (_: unknown, r: AttachmentSummary) => (
                <Button
                  icon={<DownloadOutlined />}
                  size="small"
                  type="link"
                  onClick={() => void handleDownload(r.attachmentId)}
                >
                  下载
                </Button>
              ),
              title: '操作',
              width: 100,
            },
          ]}
          dataSource={data}
          rowKey="attachmentId"
        />
      </Spin>
    </div>
  );
};

export default Library;
