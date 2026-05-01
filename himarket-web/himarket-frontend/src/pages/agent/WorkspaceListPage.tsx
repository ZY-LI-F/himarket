import { DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
  type TableColumnType,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../../components/Layout";
import {
  createWorkspace,
  deleteWorkspace,
  getAgentApiErrorMessage,
  listWorkspaces,
  setActiveWorkspace,
  type CreateWorkspaceRequest,
  type Workspace,
} from "../../lib/apis/agent";
import { formatDateTime } from "../../lib/utils";

const { Title, Text } = Typography;
const EMPTY_FORM: CreateWorkspaceRequest = { name: "" };

interface WorkspaceColumnActions {
  onDelete: (workspace: Workspace) => void;
  onSetActive: (id: string) => Promise<void>;
}

interface WorkspaceCreateModalProps {
  form: CreateWorkspaceRequest;
  open: boolean;
  saving: boolean;
  onCancel: () => void;
  onChange: (patch: Partial<CreateWorkspaceRequest>) => void;
  onSubmit: () => Promise<void>;
}

function confirmDeleteWorkspace(
  workspace: Workspace,
  onDelete: (workspace: Workspace) => Promise<void>,
) {
  Modal.confirm({
    title: `删除工作区「${workspace.name}」？`,
    content: "删除后该工作区下的房间也会被移除。",
    okText: "删除",
    okButtonProps: { danger: true },
    cancelText: "取消",
    onOk: () => onDelete(workspace),
  });
}

function buildWorkspaceColumns(
  actions: WorkspaceColumnActions,
): TableColumnType<Workspace>[] {
  return [
    {
      title: "工作区",
      dataIndex: "name",
      render: (name: string, record) => (
        <Space orientation="vertical" size={2}>
          <Space>
            <Text strong>{name}</Text>
            {record.isActive && <Tag color="blue">活跃</Tag>}
          </Space>
          <Text type="secondary">{record.description || "暂无描述"}</Text>
        </Space>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 180,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: "操作",
      key: "actions",
      width: 280,
      render: (_: unknown, record) => (
        <Space>
          <Link to={`/agent/workspaces/${record.id}/rooms`}>
            <Button>查看房间</Button>
          </Link>
          <Button
            disabled={record.isActive}
            onClick={() => void actions.onSetActive(record.id)}
          >
            设为活跃
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => actions.onDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];
}

function WorkspaceCreateModal(props: WorkspaceCreateModalProps) {
  return (
    <Modal
      title="创建工作区"
      open={props.open}
      onCancel={props.onCancel}
      onOk={() => void props.onSubmit()}
      confirmLoading={props.saving}
      okText="创建"
      cancelText="取消"
    >
      <Space className="w-full" orientation="vertical" size="middle">
        <Input
          aria-label="工作区名称"
          maxLength={128}
          placeholder="工作区名称"
          value={props.form.name}
          onChange={(event) => props.onChange({ name: event.target.value })}
        />
        <Input.TextArea
          aria-label="工作区描述"
          maxLength={1024}
          placeholder="描述（可选）"
          rows={3}
          value={props.form.description ?? ""}
          onChange={(event) =>
            props.onChange({ description: event.target.value })
          }
        />
      </Space>
    </Modal>
  );
}

function useWorkspaceListState() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateWorkspaceRequest>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const page = await listWorkspaces();
      setWorkspaces(page.content);
      setError(null);
    } catch (requestError) {
      setError(getAgentApiErrorMessage(requestError, "获取工作区失败"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setForm(EMPTY_FORM);
  }, []);

  const submitCreate = useCallback(async () => {
    const name = form.name.trim();
    if (!name) {
      setError("请输入工作区名称");
      return;
    }

    setSaving(true);
    try {
      await createWorkspace({ ...form, name });
      message.success("工作区已创建");
      closeModal();
      await loadWorkspaces();
    } catch (requestError) {
      setError(getAgentApiErrorMessage(requestError, "创建工作区失败"));
    } finally {
      setSaving(false);
    }
  }, [closeModal, form, loadWorkspaces]);

  const removeWorkspace = useCallback(
    async (workspace: Workspace) => {
      try {
        await deleteWorkspace(workspace.id);
        message.success("工作区已删除");
        await loadWorkspaces();
      } catch (requestError) {
        setError(getAgentApiErrorMessage(requestError, "删除工作区失败"));
      }
    },
    [loadWorkspaces],
  );

  const activateWorkspace = useCallback(
    async (id: string) => {
      try {
        await setActiveWorkspace(id);
        message.success("已切换活跃工作区");
        await loadWorkspaces();
      } catch (requestError) {
        setError(getAgentApiErrorMessage(requestError, "切换工作区失败"));
      }
    },
    [loadWorkspaces],
  );

  return {
    activateWorkspace,
    closeModal,
    error,
    form,
    loading,
    modalOpen,
    removeWorkspace,
    saving,
    setError,
    setForm,
    setModalOpen,
    submitCreate,
    workspaces,
    loadWorkspaces,
  };
}

export default function WorkspaceListPage() {
  const state = useWorkspaceListState();
  const columns = useMemo(
    () =>
      buildWorkspaceColumns({
        onDelete: (workspace) =>
          confirmDeleteWorkspace(workspace, state.removeWorkspace),
        onSetActive: state.activateWorkspace,
      }),
    [state.activateWorkspace, state.removeWorkspace],
  );

  return (
    <Layout>
      <div className="min-h-[calc(100vh-96px)] rounded-2xl border border-white/40 bg-white p-6 shadow-xs">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <Title level={2} className="m-0 text-gray-900">
              Agent 工作区
            </Title>
            <Text type="secondary">管理工作区，并进入对应房间列表。</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={state.loadWorkspaces} />
            <Button
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => state.setModalOpen(true)}
            >
              创建工作区
            </Button>
          </Space>
        </div>
        {state.error && (
          <Alert
            className="mb-4"
            closable
            onClose={() => state.setError(null)}
            title={state.error}
            type="error"
          />
        )}
        <div className="overflow-hidden rounded-lg border border-claude-neutral-200">
          <Table
            columns={columns}
            dataSource={state.workspaces}
            loading={state.loading}
            pagination={false}
            rowKey="id"
          />
        </div>
      </div>
      <WorkspaceCreateModal
        form={state.form}
        onCancel={state.closeModal}
        onChange={(patch) => state.setForm((current) => ({ ...current, ...patch }))}
        onSubmit={state.submitCreate}
        open={state.modalOpen}
        saving={state.saving}
      />
    </Layout>
  );
}
