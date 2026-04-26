import { Button, Modal, Space, message } from "antd";
import { Download, Power, PowerOff, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useState } from "react";
import {
  createRoomBinding,
  deleteRoomBinding,
  getAgentApiErrorMessage,
  isAgentBindingForbiddenError,
  type Binding,
  type BindingKind,
  type CreateBindingRequest,
} from "../../lib/apis/agent";

const DEFAULT_BINDING_VERSION = "1.0.0";
const FORBIDDEN_BINDING_MESSAGE = "未订阅或无权限，无法绑定到当前房间";

type BindingActionName = "install" | "enable" | "disable" | "remove";

export interface BindingActionsProps {
  binding?: Binding;
  createBinding?: (
    roomId: string,
    data: CreateBindingRequest
  ) => Promise<Binding>;
  deleteBinding?: (bindingId: string) => Promise<void>;
  disabled?: boolean;
  kind?: BindingKind;
  onChanged?: (binding?: Binding) => Promise<void> | void;
  productId: string;
  roomId?: string;
  unsupportedReason?: string;
  version?: string;
}

function bindingActionErrorMessage(error: unknown) {
  if (isAgentBindingForbiddenError(error)) {
    return FORBIDDEN_BINDING_MESSAGE;
  }
  return getAgentApiErrorMessage(error, "绑定操作失败");
}

export function BindingActions({
  binding,
  createBinding = createRoomBinding,
  deleteBinding = deleteRoomBinding,
  disabled = false,
  kind,
  onChanged,
  productId,
  roomId,
  unsupportedReason = "暂不支持绑定到房间",
  version = DEFAULT_BINDING_VERSION,
}: BindingActionsProps) {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [runningAction, setRunningAction] = useState<BindingActionName | null>(
    null
  );
  const canBind = Boolean(roomId && kind && !disabled);
  const isActive = binding?.status === "ACTIVE";
  const isDisabled = binding?.status === "DISABLED";

  const runCreate = async (action: "install" | "enable") => {
    if (!roomId || !kind) return;
    setRunningAction(action);
    try {
      const created = await createBinding(roomId, {
        kind,
        productId,
        version,
      });
      messageApi.success(action === "install" ? "已安装到当前房间" : "已启用");
      await onChanged?.(created);
    } catch (error) {
      messageApi.error(bindingActionErrorMessage(error));
    } finally {
      setRunningAction(null);
    }
  };

  const runDelete = async (action: "disable" | "remove") => {
    if (!binding) return;
    setRunningAction(action);
    try {
      await deleteBinding(binding.id);
      messageApi.success(action === "disable" ? "已禁用" : "已移除");
      await onChanged?.();
    } catch (error) {
      messageApi.error(bindingActionErrorMessage(error));
    } finally {
      setRunningAction(null);
    }
  };

  const confirmDelete = (action: "disable" | "remove") => {
    modalApi.confirm({
      title: action === "disable" ? "确认禁用绑定？" : "确认移除绑定？",
      content:
        action === "disable"
          ? "禁用后当前房间将不再使用该产品。"
          : "移除后需要重新安装才能在当前房间使用。",
      okButtonProps: { danger: true },
      okText: "确认",
      cancelText: "取消",
      onOk: () => runDelete(action),
    });
  };

  const stopRowNavigation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  if (!kind) {
    return (
      <div className="inline-flex" onClick={stopRowNavigation}>
        <Button disabled size="small">
          {unsupportedReason}
        </Button>
      </div>
    );
  }

  return (
    <div className="inline-flex" onClick={stopRowNavigation}>
      {messageContextHolder}
      {modalContextHolder}
      <Space size={6}>
        {!binding && (
          <Button
            disabled={!canBind}
            icon={<Download aria-hidden="true" size={13} />}
            loading={runningAction === "install"}
            onClick={() => void runCreate("install")}
            size="small"
            type="primary"
          >
            安装
          </Button>
        )}
        {isDisabled && (
          <Button
            disabled={!canBind}
            icon={<Power aria-hidden="true" size={13} />}
            loading={runningAction === "enable"}
            onClick={() => void runCreate("enable")}
            size="small"
            type="primary"
          >
            启用
          </Button>
        )}
        {isActive && (
          <Button
            danger
            disabled={!canBind}
            icon={<PowerOff aria-hidden="true" size={13} />}
            loading={runningAction === "disable"}
            onClick={() => confirmDelete("disable")}
            size="small"
          >
            禁用
          </Button>
        )}
        {binding && (
          <Button
            danger
            disabled={!canBind}
            icon={<Trash2 aria-hidden="true" size={13} />}
            loading={runningAction === "remove"}
            onClick={() => confirmDelete("remove")}
            size="small"
            type="text"
          >
            移除
          </Button>
        )}
      </Space>
    </div>
  );
}
