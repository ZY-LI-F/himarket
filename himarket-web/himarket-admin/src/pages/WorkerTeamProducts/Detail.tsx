import { useEffect, useMemo, useState } from "react";
import { Descriptions, Drawer, Spin } from "antd";
import type { TableProps } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { Empty, Table, emptyImages } from "@/components/common";
import {
  workerTeamProductService,
  type WorkerTeamProduct,
  type WorkerTeamProductMember,
} from "@/services/workerTeamProduct";
import { formatDateTime, formatRoleLabel, membersByRole } from "./viewModel";

interface WorkerTeamProductDetailProps {
  readonly open: boolean;
  readonly productId?: string;
  readonly onClose: () => void;
}

interface MemberSectionProps {
  readonly title: string;
  readonly emptyDescription: string;
  readonly members: readonly WorkerTeamProductMember[];
}

const STATUS_BADGE_BASE =
  "inline-flex items-center gap-2 rounded-claude-full border px-2.5 py-1 text-claude-caption font-semibold";
const STATUS_CONFIG: Record<
  string,
  { readonly className: string; readonly text: string }
> = {
  PENDING: {
    className: `${STATUS_BADGE_BASE} border-claude-semantic-warning/30 bg-claude-semantic-warning/10 text-claude-semantic-warning`,
    text: "待配置",
  },
  READY: {
    className: `${STATUS_BADGE_BASE} border-claude-semantic-info/30 bg-claude-semantic-info/10 text-claude-semantic-info`,
    text: "待发布",
  },
  PUBLISHED: {
    className: `${STATUS_BADGE_BASE} border-claude-semantic-success/30 bg-claude-semantic-success/10 text-claude-semantic-success`,
    text: "已发布",
  },
};
const UNKNOWN_STATUS_CONFIG = {
  className: `${STATUS_BADGE_BASE} border-claude-semantic-error/30 bg-claude-semantic-error/10 text-claude-semantic-error`,
  text: "未知状态",
} as const;
const ROLE_BADGE_BASE =
  "inline-flex items-center rounded-claude-full border px-2.5 py-1 text-claude-caption font-semibold";
const ROLE_BADGE_CLASS: Record<string, string> = {
  leader: `${ROLE_BADGE_BASE} border-claude-semantic-info/30 bg-claude-semantic-info/10 text-claude-semantic-info`,
  member: `${ROLE_BADGE_BASE} border-claude-semantic-success/30 bg-claude-semantic-success/10 text-claude-semantic-success`,
  skill: `${ROLE_BADGE_BASE} border-claude-semantic-warning/30 bg-claude-semantic-warning/10 text-claude-semantic-warning`,
};
const UNKNOWN_ROLE_BADGE_CLASS = `${ROLE_BADGE_BASE} border-claude-neutral-300 bg-claude-neutral-100 text-claude-neutral-700`;

function StatusBadge({ status }: { readonly status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    ...UNKNOWN_STATUS_CONFIG,
    text: status || UNKNOWN_STATUS_CONFIG.text,
  };

  return (
    <span className={config.className}>
      <span className="h-2 w-2 rounded-claude-full bg-current" />
      <span>{config.text}</span>
    </span>
  );
}

function RoleBadge({ role }: { readonly role: string }) {
  return (
    <span
      className={
        ROLE_BADGE_CLASS[role.toLowerCase()] ?? UNKNOWN_ROLE_BADGE_CLASS
      }
    >
      {formatRoleLabel(role)}
    </span>
  );
}

const memberColumns: TableProps<WorkerTeamProductMember>["columns"] = [
  {
    title: "Role",
    dataIndex: "role",
    width: 130,
    render: (role: string) => {
      return <RoleBadge role={role} />;
    },
  },
  {
    title: "Name",
    dataIndex: "refName",
    ellipsis: true,
    render: (refName: string) => {
      return (
        <span className="font-semibold text-claude-neutral-800">{refName}</span>
      );
    },
  },
  {
    title: "Version",
    dataIndex: "refVersion",
    width: 150,
    ellipsis: true,
    render: (refVersion: string) => {
      return (
        <span className="font-claude-mono text-claude-caption text-claude-neutral-700">
          {refVersion}
        </span>
      );
    },
  },
  {
    title: "Ordinal",
    dataIndex: "ordinal",
    width: 100,
    render: (ordinal: number) => {
      return (
        <span className="font-claude-mono text-claude-caption text-claude-neutral-600">
          {ordinal}
        </span>
      );
    },
  },
];

function MemberSection({
  title,
  emptyDescription,
  members,
}: MemberSectionProps) {
  return (
    <section className="rounded-claude-lg border border-claude-neutral-200 bg-claude-neutral-50 p-4 shadow-claude-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-claude-body font-bold text-claude-neutral-900">
          {title}
        </h3>
        <span className="rounded-claude-full border border-claude-neutral-200 bg-claude-neutral-100 px-2.5 py-1 text-claude-caption font-semibold text-claude-neutral-600">
          {members.length}
        </span>
      </div>
      {members.length > 0 ? (
        <Table<WorkerTeamProductMember>
          columns={memberColumns}
          dataSource={[...members]}
          pagination={false}
          rowKey={member => {
            return `${member.role}-${member.refName}-${member.refVersion}-${member.ordinal}`;
          }}
          size="small"
        />
      ) : (
        <Empty
          compact
          description={emptyDescription}
          image={emptyImages.simple}
        />
      )}
    </section>
  );
}

export default function WorkerTeamProductDetail({
  open,
  productId,
  onClose,
}: WorkerTeamProductDetailProps) {
  const [product, setProduct] = useState<WorkerTeamProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open || !productId) {
      setProduct(null);
      setError(undefined);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(undefined);
    workerTeamProductService
      .getWorkerTeamProduct(productId)
      .then(response => {
        if (!cancelled) {
          setProduct(response.data);
        }
      })
      .catch(fetchError => {
        console.error("加载 Worker Team Product 失败", fetchError);
        if (!cancelled) {
          setProduct(null);
          setError("加载 Worker Team Product 失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  const leaderMembers = useMemo(() => {
    return membersByRole(product?.members, "leader");
  }, [product]);

  const workerMembers = useMemo(() => {
    return membersByRole(product?.members, "member");
  }, [product]);

  const skillMembers = useMemo(() => {
    return membersByRole(product?.members, "skill");
  }, [product]);

  return (
    <Drawer
      destroyOnHidden
      open={open}
      onClose={onClose}
      title={
        <div className="flex flex-wrap items-center gap-3">
          <span>Worker Team Product</span>
          {product && <StatusBadge status={product.status} />}
        </div>
      }
      width={760}
    >
      <Spin spinning={loading}>
        {product ? (
          <div className="space-y-6 text-claude-neutral-900">
            <section className="rounded-claude-lg border border-claude-neutral-200 bg-claude-neutral-50 p-4 shadow-claude-sm">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-claude-md border border-claude-brand-primary/20 bg-claude-brand-surfaceTint text-colorPrimary">
                  <TeamOutlined />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-claude-h4 font-bold">
                    {product.name}
                  </h2>
                  <p className="mt-1 font-claude-mono text-claude-caption text-claude-neutral-600">
                    {product.productId}
                  </p>
                </div>
              </div>

              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Product ID">
                  <span className="font-claude-mono text-claude-caption">
                    {product.productId}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Name">
                  {product.name}
                </Descriptions.Item>
                <Descriptions.Item label="Version">
                  <span className="font-claude-mono text-claude-caption">
                    {product.version}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Business Domain">
                  {product.businessDomain || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <StatusBadge status={product.status} />
                </Descriptions.Item>
                <Descriptions.Item label="Visibility">
                  {product.visibility || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Updated At">
                  {formatDateTime(product.updatedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                  {product.description || "-"}
                </Descriptions.Item>
              </Descriptions>
            </section>

            <MemberSection
              title="Leader"
              emptyDescription="暂无 Leader"
              members={leaderMembers}
            />
            <MemberSection
              title="Members"
              emptyDescription="暂无 Members"
              members={workerMembers}
            />
            <MemberSection
              title="Skills Closure"
              emptyDescription="暂无 Skills Closure"
              members={skillMembers}
            />
          </div>
        ) : (
          <Empty
            image={
              <TeamOutlined className="text-[48px] text-claude-neutral-300" />
            }
            description={
              loading ? "加载中" : error || "暂无 Worker Team Product"
            }
          />
        )}
      </Spin>
    </Drawer>
  );
}
