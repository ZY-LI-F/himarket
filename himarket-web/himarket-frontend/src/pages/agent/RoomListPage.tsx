import { DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Input,
  Modal,
  Space,
  Table,
  Typography,
  message,
  type TableColumnType,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

const { Title, Text } = Typography;
const DEFAULT_FORM: CreateRoomRequest = {
  name: "",
  teamTemplateId: "team-default",
  modelId: "qwen-max",
};

interface RoomCreateModalProps {
  form: CreateRoomRequest;
  open: boolean;
  saving: boolean;
  onCancel: () => void;
  onChange: (patch: Partial<CreateRoomRequest>) => void;
  onSubmit: () => Promise<void>;
}

function confirmDeleteRoom(room: Room, onDelete: (room: Room) => Promise<void>) {
  Modal.confirm({
    title: `删除房间「${room.name}」？`,
    content: "删除后该房间配置会被移除。",
    okText: "删除",
    okButtonProps: { danger: true },
    cancelText: "取消",
    onOk: () => onDelete(room),
  });
}

function buildRoomColumns(onDelete: (room: Room) => void): TableColumnType<Room>[] {
  return [
    { title: "房间", dataIndex: "name", render: (name: string) => <Text strong>{name}</Text> },
    { title: "模型", dataIndex: "modelId", width: 180 },
    { title: "团队模板", dataIndex: "teamTemplateId", width: 180 },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 180,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: "操作",
      key: "actions",
      width: 160,
      render: (_: unknown, record) => (
        <Space>
          <Link to={`/agent/workspaces/${record.workspaceId}/rooms/${record.id}`}>
            进入
          </Link>
          <Button danger icon={<DeleteOutlined />} onClick={() => onDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];
}

function RoomCreateModal(props: RoomCreateModalProps) {
  return (
    <Modal
      title="创建房间"
      open={props.open}
      onCancel={props.onCancel}
      onOk={() => void props.onSubmit()}
      confirmLoading={props.saving}
      okText="创建"
      cancelText="取消"
    >
      <Space className="w-full" orientation="vertical" size="middle">
        <Input
          aria-label="房间名称"
          maxLength={128}
          placeholder="房间名称"
          value={props.form.name}
          onChange={(event) => props.onChange({ name: event.target.value })}
        />
        <Input
          aria-label="团队模板"
          placeholder="团队模板 ID"
          value={props.form.teamTemplateId}
          onChange={(event) =>
            props.onChange({ teamTemplateId: event.target.value })
          }
        />
        <Input
          aria-label="模型"
          placeholder="模型 ID"
          value={props.form.modelId}
          onChange={(event) => props.onChange({ modelId: event.target.value })}
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
    [loadRooms],
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
    () => buildRoomColumns((room) => confirmDeleteRoom(room, state.removeRoom)),
    [state.removeRoom],
  );

  return (
    <Layout>
      <div className="min-h-[calc(100vh-96px)] rounded-2xl border border-white/40 bg-white p-6 shadow-xs">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <Link to="/agent/workspaces">返回工作区</Link>
            <Title level={2} className="m-0 mt-2 text-gray-900">
              {state.workspace?.name ?? "工作区房间"}
            </Title>
            <Text type="secondary">创建和管理当前工作区的 Agent 房间。</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={state.loadRooms} />
            <Button
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => state.setModalOpen(true)}
            >
              创建房间
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
        <div className="overflow-hidden rounded-lg border border-[#e5e5e5]">
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
        onChange={(patch) => state.setForm((current) => ({ ...current, ...patch }))}
        onSubmit={state.submitCreate}
        open={state.modalOpen}
        saving={state.saving}
      />
    </Layout>
  );
}
