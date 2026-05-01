import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Input,
  Space,
  Table,
  Tag,
  Typography,
  message,
  type TableColumnType,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Modal } from "../../components/common";
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

const { Text } = Typography;
const EMPTY_FORM: CreateWorkspaceRequest = { name: "" };

interface WorkspaceColumnActions {
  readonly onDelete: (workspace: Workspace) => void;
  readonly onSetActive: (id: string) => Promise<void>;
}

interface WorkspaceCreateModalProps {
  readonly form: CreateWorkspaceRequest;
  readonly open: boolean;
  readonly saving: boolean;
  readonly onCancel: () => void;
  readonly onChange: (patch: Partial<CreateWorkspaceRequest>) => void;
  readonly onSubmit: () => Promise<void>;
}

function confirmDeleteWorkspace(
  workspace: Workspace,
  onDelete: (workspace: Workspace) => Promise<void>
) {
  Modal.confirm({
    cancelText: "取消",
    content: "删除后该工作区下的房间也会被移除。",
    okButtonProps: { danger: true },
    okText: "删除",
    onOk: () => onDelete(workspace),
    title: `删除工作区「${workspace.name}」？`,
  });
}

function buildWorkspaceColumns(
  actions: WorkspaceColumnActions
): TableColumnType<Workspace>[] {
  return [
    {
      dataIndex: "name",
      title: "工作区",
      render: (name: string, record) => (
        <Space orientation="vertical" size={2}>
          <Space>
            <Text className="text-claude-neutral-900" strong>
              {name}
            </Text>
            {record.isActive && <Tag color="success">活跃</Tag>}
          </Space>
          <Text className="max-w-xl text-claude-neutral-500">
            {record.description || "暂无描述"}
          </Text>
        </Space>
      ),
    },
    {
      dataIndex: "createdAt",
      render: (date: string) => formatDateTime(date),
      title: "创建时间",
      width: 180,
    },
    {
      key: "actions",
      render: (_: unknown, record) => (
        <Space wrap>
          <Link
            className="rounded-claude-md border border-claude-neutral-300 px-3 py-1.5 text-sm font-semibold text-claude-neutral-800 transition-colors duration-claude-fast hover:border-colorPrimary hover:text-colorPrimary"
            to={`/agent/workspaces/${record.id}/rooms`}
          >
            查看房间
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
      title: "操作",
      width: 300,
    },
  ];
}

function WorkspaceCreateModal(props: WorkspaceCreateModalProps) {
  return (
    <Modal
      cancelText="取消"
      confirmLoading={props.saving}
      okText="创建"
      onCancel={props.onCancel}
      onOk={() => void props.onSubmit()}
      open={props.open}
      title="创建工作区"
    >
      <Space className="w-full" orientation="vertical" size="middle">
        <Input
          aria-label="工作区名称"
          className="hm-form-input"
          maxLength={128}
          onChange={event => props.onChange({ name: event.target.value })}
          placeholder="工作区名称"
          value={props.form.name}
        />
        <Input.TextArea
          aria-label="工作区描述"
          className="hm-form-input"
          maxLength={1024}
          onChange={event =>
            props.onChange({ description: event.target.value })
          }
          placeholder="描述（可选）"
          rows={3}
          value={props.form.description ?? ""}
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
    [loadWorkspaces]
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
    [loadWorkspaces]
  );

  return {
    activateWorkspace,
    closeModal,
    error,
    form,
    loading,
    loadWorkspaces,
    modalOpen,
    removeWorkspace,
    saving,
    setError,
    setForm,
    setModalOpen,
    submitCreate,
    workspaces,
  };
}

export default function WorkspaceListPage() {
  const state = useWorkspaceListState();
  const hasActiveWorkspace = state.workspaces.some(
    workspace => workspace.isActive
  );
  const columns = useMemo(
    () =>
      buildWorkspaceColumns({
        onDelete: workspace =>
          confirmDeleteWorkspace(workspace, state.removeWorkspace),
        onSetActive: state.activateWorkspace,
      }),
    [state.activateWorkspace, state.removeWorkspace]
  );

  return (
    <Layout>
      <div className="min-h-[calc(100vh-96px)] py-6">
        <div className="flex flex-col gap-4 border-b border-claude-neutral-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-colorPrimary">
              Agent Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-claude-neutral-900">
              Agent 工作区
            </h1>
            <p className="mt-2 text-sm leading-6 text-claude-neutral-600">
              管理面向房间、任务运行和市场绑定的工作区，并快速进入对应房间。
            </p>
          </div>

          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={state.loadWorkspaces}>
              刷新
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => state.setModalOpen(true)}
              variant="primary"
            >
              创建工作区
            </Button>
          </Space>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-claude-md border border-claude-neutral-200 bg-white/90 p-4 shadow-claude-sm">
            <div className="text-2xl font-semibold text-claude-neutral-900">
              {state.workspaces.length}
            </div>
            <div className="mt-1 text-sm text-claude-neutral-600">
              工作区总数
            </div>
          </div>
          <div className="rounded-claude-md border border-claude-neutral-200 bg-white/90 p-4 shadow-claude-sm">
            <div className="flex items-center gap-2 text-2xl font-semibold text-claude-neutral-900">
              <RocketOutlined className="text-colorPrimary" />
              {hasActiveWorkspace ? "已设置" : "未设置"}
            </div>
            <div className="mt-1 text-sm text-claude-neutral-600">
              活跃工作区
            </div>
          </div>
          <div className="rounded-claude-md border border-claude-neutral-200 bg-white/90 p-4 shadow-claude-sm">
            <div className="text-2xl font-semibold text-claude-neutral-900">
              Rooms
            </div>
            <div className="mt-1 text-sm text-claude-neutral-600">
              从表格进入房间列表
            </div>
          </div>
        </div>

        {state.error && (
          <Alert
            className="mt-5"
            closable
            onClose={() => state.setError(null)}
            showIcon
            title={state.error}
            type="error"
          />
        )}

        <div className="mt-5 overflow-hidden rounded-claude-md border border-claude-neutral-200 bg-white/95 shadow-claude-sm">
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
        onChange={patch => state.setForm(current => ({ ...current, ...patch }))}
        onSubmit={state.submitCreate}
        open={state.modalOpen}
        saving={state.saving}
      />
    </Layout>
  );
}
