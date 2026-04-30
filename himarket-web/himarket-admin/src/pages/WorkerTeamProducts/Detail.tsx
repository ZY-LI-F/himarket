import { useEffect, useMemo, useState } from "react";
import {
  Descriptions,
  Drawer,
  Empty,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { TeamOutlined } from "@ant-design/icons";
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

const memberColumns: TableProps<WorkerTeamProductMember>["columns"] = [
  {
    title: "Role",
    dataIndex: "role",
    width: 120,
    render: (role: string) => {
      return <Tag>{formatRoleLabel(role)}</Tag>;
    },
  },
  {
    title: "Name",
    dataIndex: "refName",
    ellipsis: true,
  },
  {
    title: "Version",
    dataIndex: "refVersion",
    width: 140,
    ellipsis: true,
  },
  {
    title: "Ordinal",
    dataIndex: "ordinal",
    width: 100,
  },
];

function MemberSection({
  title,
  emptyDescription,
  members,
}: MemberSectionProps) {
  return (
    <section className="space-y-3">
      <Typography.Title level={5} className="!mb-0">
        {title}
      </Typography.Title>
      {members.length > 0 ? (
        <Table<WorkerTeamProductMember>
          rowKey={member => {
            return `${member.role}-${member.refName}-${member.refVersion}-${member.ordinal}`;
          }}
          columns={memberColumns}
          dataSource={[...members]}
          pagination={false}
          size="small"
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={emptyDescription}
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

  useEffect(() => {
    if (!open || !productId) {
      setProduct(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    workerTeamProductService
      .getWorkerTeamProduct(productId)
      .then(response => {
        if (!cancelled) {
          setProduct(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProduct(null);
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
      title="Worker Team Product"
      width={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {product ? (
          <div className="space-y-6">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Product ID">
                {product.productId}
              </Descriptions.Item>
              <Descriptions.Item label="Name">{product.name}</Descriptions.Item>
              <Descriptions.Item label="Version">
                {product.version}
              </Descriptions.Item>
              <Descriptions.Item label="Business Domain">
                {product.businessDomain || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {product.status}
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
            image={<TeamOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />}
            description={loading ? "加载中" : "暂无 Worker Team Product"}
          />
        )}
      </Spin>
    </Drawer>
  );
}
