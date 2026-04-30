import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Table, Tooltip } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import {
  workerTeamProductService,
  type WorkerTeamProduct,
} from "@/services/workerTeamProduct";
import WorkerTeamProductDetail from "./Detail";
import {
  formatDateTime,
  getLeaderName,
  WORKER_TEAM_PRODUCT_COLUMN_KEYS,
} from "./viewModel";

const STATUS_CONFIG: Record<
  string,
  { readonly color: string; readonly text: string }
> = {
  PENDING: { color: "#faad14", text: "待配置" },
  READY: { color: "#1677ff", text: "待发布" },
  PUBLISHED: { color: "#52c41a", text: "已发布" },
};

export default function WorkerTeamProducts() {
  const [products, setProducts] = useState<readonly WorkerTeamProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [detailProductId, setDetailProductId] = useState<string>();

  const fetchProducts = useCallback(
    (page: number, size: number, name: string) => {
      setLoading(true);
      const params = {
        page,
        size,
        ...(name.trim() ? { name: name.trim() } : {}),
      };

      workerTeamProductService
        .listWorkerTeamProducts(params)
        .then(response => {
          const pageData = response.data;
          setProducts(pageData.content ?? []);
          setPagination({
            current: pageData.number || page,
            pageSize: pageData.size || size,
            total: pageData.totalElements || 0,
          });
        })
        .catch(() => {
          setProducts([]);
          setPagination({
            current: page,
            pageSize: size,
            total: 0,
          });
        })
        .finally(() => {
          setLoading(false);
        });
    },
    []
  );

  useEffect(() => {
    fetchProducts(1, 20, "");
  }, [fetchProducts]);

  const handleSearch = () => {
    setNameFilter(searchInput);
    fetchProducts(1, pagination.pageSize, searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setNameFilter("");
    fetchProducts(1, pagination.pageSize, "");
  };

  const openDetail = useCallback((productId: string) => {
    setDetailProductId(productId);
  }, []);

  const columns = useMemo<TableProps<WorkerTeamProduct>["columns"]>(() => {
    return [
      {
        title: "Name",
        dataIndex: "name",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[0],
        width: 220,
        ellipsis: { showTitle: false },
        render: (_value: string, record: WorkerTeamProduct) => {
          return (
            <Tooltip placement="topLeft" title={record.name}>
              <a
                className="text-colorPrimary hover:text-colorPrimary/80 font-medium cursor-pointer"
                onClick={() => openDetail(record.productId)}
              >
                {record.name}
              </a>
            </Tooltip>
          );
        },
      },
      {
        title: "Version",
        dataIndex: "version",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[1],
        width: 140,
        ellipsis: true,
      },
      {
        title: "Business Domain",
        dataIndex: "businessDomain",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[2],
        width: 180,
        ellipsis: true,
        render: (businessDomain: string | undefined) => {
          return businessDomain || "-";
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[3],
        width: 130,
        render: (status: string) => {
          const config = STATUS_CONFIG[status] || {
            color: "#d9d9d9",
            text: status,
          };
          return (
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-sm">{config.text}</span>
            </div>
          );
        },
      },
      {
        title: "Leader",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[4],
        width: 180,
        ellipsis: true,
        render: (_value: unknown, record: WorkerTeamProduct) => {
          return getLeaderName(record);
        },
      },
      {
        title: "Updated At",
        dataIndex: "updatedAt",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[5],
        width: 180,
        render: (updatedAt: string | undefined) => {
          return formatDateTime(updatedAt);
        },
      },
    ];
  }, [openDetail]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Worker Team Products
          </h1>
          <p className="text-gray-500 mt-2">查看 Worker Team 产品编排信息</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center border border-gray-300 rounded-md overflow-hidden hover:border-colorPrimary focus-within:border-colorPrimary"
            style={{ minWidth: 260 }}
          >
            <Input
              placeholder="搜索产品名称"
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              onPressEnter={handleSearch}
              allowClear
              onClear={handleClearSearch}
              size="middle"
              variant="borderless"
              className="border-0"
            />
            <Button
              icon={<SearchOutlined />}
              onClick={handleSearch}
              style={{ width: 40 }}
              className="border-0 rounded-none"
              type="text"
            />
          </div>
        </div>
      </div>

      <Table<WorkerTeamProduct>
        rowKey="productId"
        columns={columns}
        dataSource={[...products]}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: total => `共 ${total} 条`,
          pageSizeOptions: ["10", "20", "50", "100"],
          onChange: (page, pageSize) => {
            fetchProducts(page, pageSize, nameFilter);
          },
        }}
        locale={{
          emptyText: (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <TeamOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
              <p className="text-base mt-3">暂无 Worker Team Products</p>
            </div>
          ),
        }}
      />

      <WorkerTeamProductDetail
        open={Boolean(detailProductId)}
        productId={detailProductId}
        onClose={() => setDetailProductId(undefined)}
      />
    </div>
  );
}
