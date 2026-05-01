import { useCallback, useEffect, useMemo, useState } from "react";
import { Input, Tooltip } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import { Button, Empty, Table } from "@/components/common";
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
const FILTER_BADGE_CLASS =
  "inline-flex max-w-full items-center rounded-claude-full border border-claude-semantic-info/30 bg-claude-semantic-info/10 px-3 py-1 text-claude-caption font-semibold text-claude-semantic-info";

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

export default function WorkerTeamProducts() {
  const [products, setProducts] = useState<readonly WorkerTeamProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
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
      setError(undefined);
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
        .catch(fetchError => {
          console.error("加载 Worker Team Products 失败", fetchError);
          setError("加载 Worker Team Products 失败");
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
        width: 260,
        ellipsis: { showTitle: false },
        render: (_value: string, record: WorkerTeamProduct) => {
          return (
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-claude-md border border-claude-brand-primary/20 bg-claude-brand-surfaceTint text-colorPrimary">
                <TeamOutlined />
              </span>
              <Tooltip placement="topLeft" title={record.name}>
                <button
                  className="min-w-0 truncate text-left font-semibold text-colorPrimary transition-colors duration-claude-fast ease-claude hover:text-colorPrimary/80"
                  onClick={() => openDetail(record.productId)}
                  type="button"
                >
                  {record.name}
                </button>
              </Tooltip>
            </div>
          );
        },
      },
      {
        title: "Version",
        dataIndex: "version",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[1],
        width: 140,
        ellipsis: true,
        render: (version: string | undefined) => {
          return (
            <span className="font-claude-mono text-claude-caption text-claude-neutral-700">
              {version || "-"}
            </span>
          );
        },
      },
      {
        title: "Business Domain",
        dataIndex: "businessDomain",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[2],
        width: 180,
        ellipsis: true,
        render: (businessDomain: string | undefined) => {
          return (
            <span className="text-claude-body-sm text-claude-neutral-700">
              {businessDomain || "-"}
            </span>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[3],
        width: 150,
        render: (status: string) => {
          return <StatusBadge status={status} />;
        },
      },
      {
        title: "Leader",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[4],
        width: 200,
        ellipsis: true,
        render: (_value: unknown, record: WorkerTeamProduct) => {
          return (
            <span className="font-claude-mono text-claude-caption text-claude-neutral-700">
              {getLeaderName(record)}
            </span>
          );
        },
      },
      {
        title: "Updated At",
        dataIndex: "updatedAt",
        key: WORKER_TEAM_PRODUCT_COLUMN_KEYS[5],
        width: 190,
        render: (updatedAt: string | undefined) => {
          return (
            <span className="text-claude-body-sm text-claude-neutral-600">
              {formatDateTime(updatedAt)}
            </span>
          );
        },
      },
    ];
  }, [openDetail]);

  const trimmedFilter = nameFilter.trim();

  return (
    <div className="space-y-6 text-claude-neutral-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-claude-full border border-claude-brand-primary/20 bg-claude-brand-surfaceTint px-3 py-1 text-claude-caption font-semibold text-colorPrimary">
            Worker orchestration
          </div>
          <div>
            <h1 className="text-claude-h3 font-bold tracking-normal">
              Worker Team Products
            </h1>
            <p className="mt-2 text-claude-body-sm text-claude-neutral-600">
              查看 Worker Team 产品编排信息、负责人和发布状态。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="rounded-claude-md border border-claude-neutral-200 bg-claude-neutral-50 px-4 py-3 shadow-claude-sm">
            <div className="text-claude-caption font-semibold uppercase text-claude-neutral-500">
              Total
            </div>
            <div className="mt-1 text-claude-h4 font-bold">
              {pagination.total}
            </div>
          </div>
          <div className="rounded-claude-md border border-claude-neutral-200 bg-claude-neutral-50 px-4 py-3 shadow-claude-sm">
            <div className="text-claude-caption font-semibold uppercase text-claude-neutral-500">
              Current Page
            </div>
            <div className="mt-1 text-claude-h4 font-bold">
              {products.length}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-claude-lg border border-claude-neutral-200 bg-claude-neutral-50 p-3 shadow-claude-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            allowClear
            className="w-full sm:max-w-sm"
            onChange={event => setSearchInput(event.target.value)}
            onClear={handleClearSearch}
            onPressEnter={handleSearch}
            placeholder="搜索产品名称"
            prefix={<SearchOutlined className="text-claude-neutral-400" />}
            value={searchInput}
          />
          {trimmedFilter && (
            <span className={FILTER_BADGE_CLASS}>
              <span className="truncate">名称：{trimmedFilter}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {trimmedFilter && (
            <Button onClick={handleClearSearch} variant="ghost">
              清除
            </Button>
          )}
          <Button icon={<SearchOutlined />} onClick={handleSearch} variant="primary">
            搜索
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-claude-md border border-claude-semantic-error/30 bg-claude-semantic-error/10 px-4 py-3 text-claude-body-sm font-semibold text-claude-semantic-error">
          {error}
        </div>
      )}

      <Table<WorkerTeamProduct>
        columns={columns}
        dataSource={[...products]}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              image={
                <TeamOutlined className="text-[48px] text-claude-neutral-300" />
              }
              description={error || "暂无 Worker Team Products"}
            />
          ),
        }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: total => `共 ${total} 条`,
          pageSizeOptions: ["10", "20", "50", "100"],
          onChange: (page, pageSize) => {
            fetchProducts(page, pageSize, nameFilter);
          },
        }}
        rowKey="productId"
        scroll={{ x: 1120 }}
      />

      <WorkerTeamProductDetail
        open={Boolean(detailProductId)}
        productId={detailProductId}
        onClose={() => setDetailProductId(undefined)}
      />
    </div>
  );
}
