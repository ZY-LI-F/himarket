import {
  Alert,
  Button,
  Drawer,
  List,
  Space,
  Spin,
  Tabs,
  Typography,
  message,
} from "antd";
import { AppWindow, RefreshCw, ShoppingBag } from "lucide-react";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAgentApiErrorMessage,
  getRoomConfig,
  listRoomBindings,
  listTeamTemplates,
  updateRoomConfig,
  type Binding,
  type BindingKind,
  type TeamTemplate,
  type TeamTemplateList,
} from "../../lib/apis/agent";
import type { IProductDetail } from "../../lib/apis/product";
import { BindingActions } from "./BindingActions";

const LegacyMcpSquare = React.lazy(() => import("../../pages/McpSquare"));
const LegacySquare = React.lazy(() => import("../../pages/Square"));

const DEFAULT_BINDING_VERSION = "1.0.0";

export interface MarketDrawerProps {
  defaultOpen?: boolean;
  onBindingChanged?: () => Promise<void> | void;
  roomId?: string;
}

function bindingKey(kind: BindingKind, productId: string) {
  return `${kind}:${productId}`;
}

function productVersion(product: IProductDetail) {
  return product.skillConfig?.currentVersion || DEFAULT_BINDING_VERSION;
}

function LoadingPanel() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spin />
    </div>
  );
}

function EmbeddedPanel({ children }: { children: ReactNode }) {
  return <div className="h-[calc(100vh-170px)] min-h-[520px]">{children}</div>;
}

function TeamTemplatePanel({
  onApplied,
  roomId,
}: {
  onApplied?: () => Promise<void> | void;
  roomId?: string;
}) {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [templates, setTemplates] = useState<TeamTemplateList>([]);
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await listTeamTemplates());
      setError(null);
    } catch (requestError) {
      setError(getAgentApiErrorMessage(requestError, "加载团队模板失败"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const applyTemplate = async (template: TeamTemplate) => {
    if (!roomId) return;
    setApplyingId(template.id);
    try {
      const config = await getRoomConfig(roomId);
      await updateRoomConfig(roomId, {
        ...config,
        teamTemplateId: template.id,
      });
      messageApi.success("团队模板已应用到当前房间");
      await onApplied?.();
    } catch (requestError) {
      messageApi.error(
        getAgentApiErrorMessage(requestError, "应用团队模板失败")
      );
    } finally {
      setApplyingId(null);
    }
  };

  if (!roomId) {
    return <Alert message="缺少房间 ID，无法应用团队模板" type="warning" />;
  }

  return (
    <Space className="w-full" orientation="vertical" size="middle">
      {messageContextHolder}
      {error && <Alert message={error} showIcon type="error" />}
      <List
        bordered
        dataSource={templates}
        loading={loading}
        renderItem={template => (
          <List.Item
            actions={[
              <Button
                icon={<AppWindow aria-hidden="true" size={14} />}
                key="apply"
                loading={applyingId === template.id}
                onClick={() => void applyTemplate(template)}
                size="small"
                type="primary"
              >
                应用
              </Button>,
            ]}
          >
            <List.Item.Meta
              description={
                <span>
                  version {template.version} · workers {template.workers.length}
                </span>
              }
              title={template.name}
            />
          </List.Item>
        )}
      />
    </Space>
  );
}

export function MarketDrawer({
  defaultOpen = false,
  onBindingChanged,
  roomId,
}: MarketDrawerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [loadingBindings, setLoadingBindings] = useState(false);
  const [bindingError, setBindingError] = useState<string | null>(null);

  const bindingByKey = useMemo(
    () =>
      new Map(
        bindings.map(binding => [
          bindingKey(binding.kind, binding.productId),
          binding,
        ])
      ),
    [bindings]
  );

  const refreshBindings = useCallback(async () => {
    if (!roomId) return;
    setLoadingBindings(true);
    try {
      setBindings(await listRoomBindings(roomId));
      setBindingError(null);
    } catch (requestError) {
      setBindingError(
        getAgentApiErrorMessage(requestError, "加载房间绑定失败")
      );
    } finally {
      setLoadingBindings(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (open) void refreshBindings();
  }, [open, refreshBindings]);

  const handleBindingChanged = useCallback(async () => {
    await refreshBindings();
    await onBindingChanged?.();
  }, [onBindingChanged, refreshBindings]);

  const renderActionsForKind = useCallback(
    (kind: BindingKind) => (product: IProductDetail) => (
      <BindingActions
        binding={bindingByKey.get(bindingKey(kind, product.productId))}
        kind={kind}
        onChanged={handleBindingChanged}
        productId={product.productId}
        roomId={roomId}
        version={productVersion(product)}
      />
    ),
    [bindingByKey, handleBindingChanged, roomId]
  );

  const renderUnsupportedActions = useCallback(
    (label: string) => (product: IProductDetail) => (
      <BindingActions
        productId={product.productId}
        roomId={roomId}
        unsupportedReason={`${label} 暂未接入房间绑定`}
      />
    ),
    [roomId]
  );

  const tabItems = useMemo(
    () => [
      {
        key: "skill",
        label: "Skill",
        children: (
          <EmbeddedPanel>
            <LegacySquare
              activeType="AGENT_SKILL"
              embedded
              renderActions={renderActionsForKind("SKILL")}
            />
          </EmbeddedPanel>
        ),
      },
      {
        key: "mcp",
        label: "MCP",
        children: (
          <EmbeddedPanel>
            <LegacyMcpSquare
              embedded
              renderActions={renderActionsForKind("MCP")}
            />
          </EmbeddedPanel>
        ),
      },
      {
        key: "model",
        label: "Model",
        children: (
          <EmbeddedPanel>
            <LegacySquare
              activeType="MODEL_API"
              embedded
              renderActions={renderActionsForKind("MODEL")}
            />
          </EmbeddedPanel>
        ),
      },
      {
        key: "worker",
        label: "Worker",
        children: (
          <EmbeddedPanel>
            <LegacySquare
              activeType="WORKER"
              embedded
              renderActions={renderUnsupportedActions("Worker")}
            />
          </EmbeddedPanel>
        ),
      },
      {
        key: "team-template",
        label: "TeamTemplate",
        children: (
          <TeamTemplatePanel onApplied={onBindingChanged} roomId={roomId} />
        ),
      },
    ],
    [onBindingChanged, renderActionsForKind, renderUnsupportedActions, roomId]
  );

  return (
    <div className="flex h-full flex-col gap-3">
      {!roomId && <Alert message="缺少房间 ID" type="warning" />}
      <Button
        disabled={!roomId}
        icon={<ShoppingBag aria-hidden="true" size={16} />}
        onClick={() => setOpen(true)}
        type="primary"
      >
        打开市场
      </Button>
      <Typography.Text className="text-xs text-gray-500">
        从市场安装 Skill、MCP、Model 到当前房间。
      </Typography.Text>
      <Drawer
        destroyOnHidden
        onClose={() => setOpen(false)}
        open={open}
        title="Market"
        width="min(1180px, calc(100vw - 48px))"
      >
        <Suspense fallback={<LoadingPanel />}>
          <Space className="w-full" orientation="vertical" size="middle">
            {bindingError && (
              <Alert message={bindingError} showIcon type="error" />
            )}
            {loadingBindings ? (
              <LoadingPanel />
            ) : (
              <Tabs
                items={tabItems}
                tabBarExtraContent={
                  <Button
                    icon={<RefreshCw aria-hidden="true" size={14} />}
                    loading={loadingBindings}
                    onClick={() => void refreshBindings()}
                    size="small"
                  >
                    刷新绑定
                  </Button>
                }
              />
            )}
          </Space>
        </Suspense>
      </Drawer>
    </div>
  );
}
