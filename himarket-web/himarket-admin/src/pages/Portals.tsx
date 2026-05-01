import { useState, useCallback, memo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Avatar,
  Dropdown,
  Modal,
  Form,
  Input,
  message,
  Tooltip,
  Pagination,
  Skeleton,
} from "antd";
import { PlusOutlined, MoreOutlined, LinkOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { portalApi } from "../lib/api";

import { Portal } from '@/types'

const STATUS_PILL_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold";
const SUCCESS_PILL_CLASS = `${STATUS_PILL_BASE} border-claude-semantic-success/30 bg-claude-semantic-success/10 text-claude-semantic-success`;
const WARNING_PILL_CLASS = `${STATUS_PILL_BASE} border-claude-semantic-warning/30 bg-claude-semantic-warning/10 text-claude-semantic-warning`;
const ERROR_PILL_CLASS = `${STATUS_PILL_BASE} border-claude-semantic-error/30 bg-claude-semantic-error/10 text-claude-semantic-error`;
const INFO_PILL_CLASS = `${STATUS_PILL_BASE} border-claude-semantic-info/30 bg-claude-semantic-info/10 text-claude-semantic-info`;

// 优化的Portal卡片组件
const PortalCard = memo(
  ({
    portal,
    onNavigate,
    fetchPortals,
  }: {
    portal: Portal;
    onNavigate: (id: string) => void;
    fetchPortals: () => void;
  }) => {
    const handleCardClick = useCallback(() => {
      onNavigate(portal.portalId);
    }, [portal.portalId, onNavigate]);

    const handleLinkClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    const dropdownItems: MenuProps["items"] = [

      {
        key: "delete",
        label: "删除",
        danger: true,
        onClick: (e) => {
          e?.domEvent?.stopPropagation(); // 阻止事件冒泡
          Modal.confirm({
            title: "删除Portal",
            content: "确定要删除该Portal吗？",
            onOk: () => {
              return handleDeletePortal(portal.portalId);
            },
          });
        },
      },
    ];

    const handleDeletePortal = useCallback((portalId: string) => {
      return portalApi.deletePortal(portalId).then(() => {
        message.success("Portal删除成功");
        fetchPortals();
      }).catch((error) => {
        message.error(error?.response?.data?.message || "删除失败，请稍后重试");
        throw error;
      });
    }, [fetchPortals]);

    return (
      <Card
        hoverable
        className="
          bg-claude-neutral-50/85 backdrop-blur-sm rounded-claude-lg
          border border-claude-neutral-200 cursor-pointer shadow-claude-sm
          transition-all duration-claude-base ease-claude
          hover:bg-white hover:shadow-claude-md hover:scale-[1.01] hover:border-claude-brand-primary/40
          active:scale-[0.99]
          relative overflow-hidden group
        "
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar
                size={48}
                className="bg-gradient-to-br from-claude-brand-primary to-claude-brand-hover text-lg font-semibold border-none"
              >
                {portal.title.charAt(0).toUpperCase()}
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-claude-neutral-50 bg-claude-semantic-success"></div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-claude-neutral-900 mb-1">
                {portal.title}
              </h3>
              <p className="text-sm text-claude-neutral-600">{portal.description}</p>
            </div>
          </div>
          <Dropdown menu={{ items: dropdownItems }} trigger={["click"]}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
              className="rounded-full hover:bg-claude-neutral-100"
            />
          </Dropdown>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-3 rounded-claude-md border border-claude-brand-primary/20 bg-claude-brand-surfaceTint/70 p-3">
            <LinkOutlined className="h-4 w-4 text-colorPrimary" />
            <Tooltip
              title={portal.portalDomainConfig?.[portal.portalDomainConfig.length - 1]?.domain}
              placement="top"
            >
              <a
                href={`http://${portal.portalDomainConfig?.[portal.portalDomainConfig.length - 1]?.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-colorPrimary hover:text-colorPrimary font-medium text-sm"
                onClick={handleLinkClick}
                style={{
                  display: "inline-block",
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  verticalAlign: "bottom",
                  cursor: "pointer",
                }}
              >
                {portal.portalDomainConfig?.[portal.portalDomainConfig.length - 1]?.domain}
              </a>
            </Tooltip>
          </div>

          <div className="space-y-3">
            {/* 第一行：账号密码登录 + 开发者自动审批 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-claude-sm bg-claude-neutral-100/70 p-2">
                <span className="text-xs font-medium text-claude-neutral-700">
                  账号密码登录
                </span>
                <span
                  className={
                    portal.portalSettingConfig?.builtinAuthEnabled
                      ? SUCCESS_PILL_CLASS
                      : ERROR_PILL_CLASS
                  }
                >
                  {portal.portalSettingConfig?.builtinAuthEnabled
                    ? "支持"
                    : "不支持"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-claude-sm bg-claude-neutral-100/70 p-2">
                <span className="text-xs font-medium text-claude-neutral-700">
                  开发者自动审批
                </span>
                <span
                  className={
                    portal.portalSettingConfig?.autoApproveDevelopers
                      ? SUCCESS_PILL_CLASS
                      : WARNING_PILL_CLASS
                  }
                >
                  {portal.portalSettingConfig?.autoApproveDevelopers
                    ? "是"
                    : "否"}
                </span>
              </div>
            </div>

            {/* 第二行：订阅自动审批 + 域名配置 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-claude-sm bg-claude-neutral-100/70 p-2">
                <span className="text-xs font-medium text-claude-neutral-700">
                  订阅自动审批
                </span>
                <span
                  className={
                    portal.portalSettingConfig?.autoApproveSubscriptions
                      ? SUCCESS_PILL_CLASS
                      : WARNING_PILL_CLASS
                  }
                >
                  {portal.portalSettingConfig?.autoApproveSubscriptions
                    ? "是"
                    : "否"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-claude-sm bg-claude-neutral-100/70 p-2">
                <span className="text-xs font-medium text-claude-neutral-700">
                  域名配置
                </span>
                <span className={INFO_PILL_CLASS}>
                  {portal.portalDomainConfig?.length || 0}个
                </span>
              </div>
            </div>
          </div>

        </div>
      </Card>
    );
  }
);

PortalCard.displayName = "PortalCard";

export default function Portals() {
  const navigate = useNavigate();
  const [portals, setPortals] = useState<Portal[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // 初始状态为 loading
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0,
  });

  const fetchPortals = useCallback((page = 1, size = 12) => {
    setLoading(true);
    portalApi.getPortals({ page, size }).then((res: any) => {
      const list = res?.data?.content || [];
      const portals: Portal[] = list.map((item: any) => ({
        portalId: item.portalId,
        name: item.name,
        title: item.name,
        description: item.description,
        adminId: item.adminId,
        portalSettingConfig: item.portalSettingConfig,
        portalUiConfig: item.portalUiConfig,
        portalDomainConfig: item.portalDomainConfig || [],
      }));
      setPortals(portals);
      setPagination({
        current: page,
        pageSize: size,
        total: res?.data?.totalElements || 0,
      });
    }).catch((err: any) => {
      setError(err?.message || "加载失败");
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setError(null);
    fetchPortals(1, 12);
  }, [fetchPortals]);

  // 处理分页变化
  const handlePaginationChange = (page: number, pageSize: number) => {
    fetchPortals(page, pageSize);
  };

  const handleCreatePortal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleModalOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const newPortal = {
        name: values.name,
        title: values.title,
        description: values.description,
      };

      await portalApi.createPortal(newPortal);
      message.success("Portal创建成功");
      setIsModalVisible(false);
      form.resetFields();

      fetchPortals()
    } catch (error: any) {
      // message.error(error?.message || "创建失败");
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleModalCancel = useCallback(() => {
    setIsModalVisible(false);
    form.resetFields();
  }, [form]);

  const handlePortalClick = useCallback(
    (portalId: string) => {
      navigate(`/portals/${portalId}`);
    },
    [navigate]
  );

  return (
    <div className="space-y-6 text-claude-neutral-900">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Portal</h1>
          <p className="text-claude-neutral-600 mt-2">管理和配置您的开发者门户</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreatePortal}
        >
          创建 Portal
        </Button>
      </div>
      {error && <div className="text-claude-semantic-error">{error}</div>}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: pagination.pageSize || 12 }).map((_, index) => (
            <div key={index} className="h-full rounded-claude-lg border border-claude-neutral-200 bg-claude-neutral-50 p-4 shadow-claude-sm">
              <div className="flex items-start space-x-4">
                <Skeleton.Avatar size={48} active />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton.Input active size="small" style={{ width: 120 }} />
                    <Skeleton.Input active size="small" style={{ width: 60 }} />
                  </div>
                  <Skeleton.Input active size="small" style={{ width: '100%', marginBottom: 12 }} />
                  <Skeleton.Input active size="small" style={{ width: '80%', marginBottom: 8 }} />
                  <div className="flex items-center justify-between">
                    <Skeleton.Input active size="small" style={{ width: 60 }} />
                    <Skeleton.Input active size="small" style={{ width: 80 }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {portals.map((portal) => (
              <PortalCard
                key={portal.portalId}
                portal={portal}
                onNavigate={handlePortalClick}
                fetchPortals={() => fetchPortals(pagination.current, pagination.pageSize)}
              />
            ))}
          </div>

          {pagination.total > 0 && (
            <div className="flex justify-center mt-6">
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onChange={handlePaginationChange}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 条`}
                pageSizeOptions={['6', '12', '24', '48']}
              />
            </div>
          )}
        </>
      )}

      <Modal
        title="创建Portal"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: "请输入Portal名称" }]}
          >
            <Input placeholder="请输入Portal名称" />
          </Form.Item>

          {/* <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: "请输入Portal标题" }]}
          >
            <Input placeholder="请输入Portal标题" />
          </Form.Item> */}

          <Form.Item
            name="description"
            label="描述"
            rules={[{ message: "请输入描述" }]}
          >
            <Input.TextArea rows={3} placeholder="请输入Portal描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
