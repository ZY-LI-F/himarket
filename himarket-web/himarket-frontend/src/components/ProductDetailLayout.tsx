import type { ReactNode, Ref } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "antd";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Layout } from "./Layout";
import { ProductHeader } from "./ProductHeader";
import type { ProductHeaderHandle } from "./ProductHeader";
import type {
  IProductIcon,
  IMCPConfig,
  IAgentConfig,
} from "../lib/apis/typing";
import { DetailSkeleton } from "./loading";

export interface ProductDetailHeaderProps {
  name: string;
  description: string;
  icon?: IProductIcon;
  defaultIcon?: string;
  mcpConfig?: IMCPConfig;
  agentConfig?: IAgentConfig;
  updatedAt?: string;
  productType?:
    | "REST_API"
    | "MCP_SERVER"
    | "AGENT_API"
    | "MODEL_API"
    | "AGENT_SKILL";
  ref?: Ref<ProductHeaderHandle>;
  onSubscriptionStatusChange?: (subscribed: boolean) => void;
}

export interface ProductDetailLayoutProps {
  leftContent: ReactNode;
  rightContent: ReactNode;
  headerProps?: ProductDetailHeaderProps;
  loading?: boolean;
  error?: string;
  onBack?: () => void;
}

export function ProductDetailLayout({
  leftContent,
  rightContent,
  headerProps,
  loading,
  error,
  onBack,
}: ProductDetailLayoutProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 py-6">
          <DetailSkeleton />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl p-8">
          <Alert message="错误" description={error} type="error" showIcon />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl py-6 sm:py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-2 text-sm text-claude-neutral-500"
          >
            <span className="font-medium text-claude-neutral-700">
              Marketplace
            </span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Detail</span>
            {headerProps?.name && (
              <>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate text-claude-neutral-800">
                  {headerProps.name}
                </span>
              </>
            )}
          </nav>

          <button
            onClick={onBack || (() => navigate(-1))}
            className="
              inline-flex w-fit items-center gap-2 rounded-claude-full border border-claude-neutral-200
              bg-claude-neutral-50/80 px-4 py-2 text-sm font-medium text-claude-neutral-600
              shadow-claude-sm transition-all duration-claude-base ease-claude
              hover:border-colorPrimary/30 hover:bg-colorPrimaryBgHover hover:text-colorPrimary
            "
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>返回</span>
          </button>
        </div>

        {headerProps && (
          <div className="mb-8">
            <ProductHeader {...headerProps} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
          <div className="min-w-0 order-2 lg:order-1">{leftContent}</div>
          <div className="min-w-0 order-1 lg:order-2">{rightContent}</div>
        </div>
      </div>
    </Layout>
  );
}
