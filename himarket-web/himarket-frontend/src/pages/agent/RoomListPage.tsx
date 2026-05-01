import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
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
import { Link, useParams } from "react-router-dom";
import { Button, Modal } from "../../components/common";
import { Layout } from "../../components/Layout";
import {
  createRoom,
  deleteRoom,
  getAgentApiErrorMessage,
  getWorkspace,
  listRooms,
  type CreateRoomRequest,
  type Room,
  type Workspace,
} from "../../lib/apis/agent";
import { formatDateTime } from "../../lib/utils";

const { Text } = Typography;
const DEFAULT_FORM: CreateRoomRequest = {
  modelId: "qwen-max",
  name: "",
  teamTemplateId: "team-default",
};

interface RoomCreateModalProps {
  readonly form: CreateRoomRequest;
  readonly open: boolean;
  readonly saving: boolean;
  readonly onCancel: () => void;
  readonly onChange: (patch: Partial<CreateRoomRequest>) => void;
  readonly onSubmit: () => Promise<void>;
}

function confirmDeleteRoom(
  room: Room,
  onDelete: (room: Room) => Promise<void>
) {
  Modal.confirm({
    cancelText: "取消",
    content: "删除后该房间配置会被移除。",
    okButtonProps: { danger: true },
    okText: "删除",
    onOk: () => onDelete(room),
    title: `删除房间「${room.name}」？`,
  });
}

function buildRoomColumns(
  onDelete: (room: Room) => void
): TableColumnType<Room>[] {
  return [
    {
      dataIndex: "name",
      render: (name: string) => (
        <Text className="text-claude-neutral-900" strong>
          {name}
        </Text>
      ),
      title: "房间",
    },
    {
      dataIndex: "modelId",
      render: (modelId: string) => <Tag>{modelId}</Tag>,
      title: "模型",
      width: 180,
    },
    {
      dataIndex: "teamTemplateId",
      render: (teamTemplateId: string) => (
        <Tag color="processing">{teamTemplateId}</Tag>
      ),
      title: "团队模板",
      width: 180,
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
            to={`/agent/workspaces/${record.workspaceId}/rooms/${record.id}`}
          >
            进入
          </Link>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
      title: "操作",
      width: 170,
    },
  ];
}

function RoomCreateModal(props: RoomCreateModalProps) {
  return (
    <Modal
      cancelText="取消"
      confirmLoading={props.saving}
      okText="创建"
      onCancel={props.onCancel}
      onOk={() => void props.onSubmit()}
      open={props.open}
      title="创建房间"
    >
      <Space className="w-full" orientation="vertical" size="middle">
        <Input
          aria-label="房间名称"
          className="hm-form-input"
          maxLength={128}
          onChange={event => props.onChange({ name: event.target.value })}
          placeholder="房间名称"
          value={props.form.name}
        />
        <Input
          aria-label="团队模板"
          className="hm-form-input"
          onChange={event =>
            props.onChange({ teamTemplateId: event.target.value })
          }
          placeholder="团队模板 ID"
          value={props.form.teamTemplateId}
        />
        <Input
          aria-label="模型"
          className="hm-form-input"
          onChange={event => props.onChange({ modelId: event.target.value })}
          placeholder="模型 ID"
          value={props.form.modelId}
        />
      </Space>
    </Modal>
  );
}

function useRoomListState(workspaceId: string | undefined) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateRoomRequest>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    if (!workspaceId) {
      setError("缺少工作区 ID");
      return;
    }

    setLoading(true);
    try {
      const [workspaceDetail, roomList] = await Promise.all([
        getWorkspace(workspaceId),
        listRooms(workspaceId),
      ]);
      setWorkspace(workspaceDetail);
      setRooms(roomList);
      setError(null);
    } catch (requestError) {
      setError(getAgentApiErrorMessage(requestError, "获取房间列表失败"));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setForm(DEFAULT_FORM);
  }, []);

  const submitCreate = useCallback(async () => {
    const name = form.name.trim();
    if (!workspaceId || !name) {
      setError(!workspaceId ? "缺少工作区 ID" : "请输入房间名称");
      return;
    }

    setSaving(true);
    try {
      await createRoom(workspaceId, { ...form, name });
      message.success("房间已创建");
      closeModal();
      await loadRooms();
    } catch (requestError) {
      setError(getAgentApiErrorMessage(requestError, "创建房间失败"));
    } finally {
      setSaving(false);
    }
  }, [closeModal, form, loadRooms, workspaceId]);

  const removeRoom = useCallback(
    async (room: Room) => {
      try {
        await deleteRoom(room.id);
        message.success("房间已删除");
        await loadRooms();
      } catch (requestError) {
        setError(getAgentApiErrorMessage(requestError, "删除房间失败"));
      }
    },
    [loadRooms]
  );

  return {
    closeModal,
    error,
    form,
    loadRooms,
    loading,
    modalOpen,
    removeRoom,
    rooms,
    saving,
    setError,
    setForm,
    setModalOpen,
    submitCreate,
    workspace,
  };
}

export default function RoomListPage() {
  const { wsId } = useParams();
  const state = useRoomListState(wsId);
  const columns = useMemo(
    () => buildRoomColumns(room => confirmDeleteRoom(room, state.removeRoom)),
    [state.removeRoom]
  );

  return (
    <Layout>
      <div className="min-h-[calc(100vh-96px)] py-6">
        <div className="flex flex-col gap-4 border-b border-claude-neutral-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Link
              className="inline-flex items-center gap-2 rounded-claude-md px-2 py-1 text-sm font-semibold text-claude-neutral-600 transition-colors duration-claude-fast hover:bg-colorPrimaryBgHover hover:text-colorPrimary"
              to="/agent/workspaces"
            >
              <ArrowLeftOutlined />
              返回工作区
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-claude-neutral-900">
              {state.workspace?.name ?? "工作区房间"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-claude-neutral-600">
              创建和管理当前工作区的 Agent
              房间，配置模型与团队模板后进入协作界面。
            </p>
          </div>

          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={state.loadRooms}>
              刷新
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => state.setModalOpen(true)}
              variant="primary"
            >
              创建房间
            </Button>
          </Space>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-claude-md border border-claude-neutral-200 bg-white/90 p-4 shadow-claude-sm">
            <div className="text-2xl font-semibold text-claude-neutral-900">
              {state.rooms.length}
            </div>
            <div className="mt-1 text-sm text-claude-neutral-600">房间总数</div>
          </div>
          <div className="rounded-claude-md border border-claude-neutral-200 bg-white/90 p-4 shadow-claude-sm">
            <div className="text-2xl font-semibold text-claude-neutral-900">
              {state.workspace?.isActive ? "活跃" : "待切换"}
            </div>
            <div className="mt-1 text-sm text-claude-neutral-600">
              工作区状态
            </div>
          </div>
          <div className="rounded-claude-md border border-claude-neutral-200 bg-white/90 p-4 shadow-claude-sm">
            <div className="text-2xl font-semibold text-claude-neutral-900">
              Team
            </div>
            <div className="mt-1 text-sm text-claude-neutral-600">
              房间内绑定团队模板
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
            dataSource={state.rooms}
            loading={state.loading}
            pagination={false}
            rowKey="id"
          />
        </div>
      </div>
      <RoomCreateModal
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
