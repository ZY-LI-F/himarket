import { Link, useLocation } from "react-router-dom";
import { Skeleton } from "antd";
import {
  ApiOutlined,
  ToolOutlined,
  RobotOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { UserInfo } from "./UserInfo";

interface NavigationProps {
  loading?: boolean;
}

export function Navigation({ loading = false }: NavigationProps) {
  const location = useLocation();
  const { t } = useTranslation("header");

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const navigationItems = [
    {
      path: "/apis",
      icon: <ApiOutlined />,
      title: "APIs",
      subtitle: t("navigation.restApi"),
    },
    {
      path: "/mcp",
      icon: <ToolOutlined />,
      title: "MCP",
      subtitle: t("navigation.toolIntegration"),
    },
    {
      path: "/models",
      icon: <BulbOutlined />,
      title: "Model",
      subtitle: t("navigation.aiModel"),
    },
    {
      path: "/agents",
      icon: <RobotOutlined />,
      title: "Agent",
      subtitle: t("navigation.intelligentAssistant"),
    },
  ];

  return (
    <nav className="sticky top-4 z-40">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="relative flex min-h-20 items-center justify-between rounded-claude-xl border border-claude-neutral-200/80 bg-claude-neutral-50/90 px-5 shadow-claude-sm backdrop-blur-md">
          <div className="flex items-center">
            {loading ? (
              <div className="flex items-center space-x-2">
                <Skeleton.Avatar size={32} active />
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120, height: 24 }}
                />
              </div>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-2 rounded-claude-full px-1 py-1 transition-all duration-claude-base ease-claude hover:bg-colorPrimaryBgHover"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-claude-lg bg-claude-neutral-900">
                  <img
                    src="/logo.png"
                    alt="logo"
                    className="w-6 h-6"
                    style={{ display: "block" }}
                  />
                </div>
                <span className="text-lg font-semibold text-claude-neutral-900">
                  HiMarket
                </span>
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {loading ? (
              <div className="flex space-x-3">
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 100, height: 60 }}
                />
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 100, height: 60 }}
                />
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 100, height: 60 }}
                />
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 100, height: 60 }}
                />
              </div>
            ) : (
              <div className="flex space-x-3">
                {navigationItems.map(item => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-w-[108px] flex-col items-center justify-center rounded-claude-lg border px-4 py-3 font-medium transition-all duration-claude-base ease-claude ${
                        active
                          ? "border-colorPrimary/40 bg-colorPrimary text-claude-neutral-50 shadow-claude-sm"
                          : "border-transparent text-claude-neutral-700 hover:border-colorPrimary/25 hover:bg-colorPrimaryBgHover hover:text-colorPrimary"
                      }`}
                    >
                      <div className="mb-1 flex items-center space-x-1">
                        <div
                          className={`text-lg ${active ? "text-claude-neutral-50" : "text-colorPrimary"}`}
                        >
                          {item.icon}
                        </div>
                        <div className="text-sm font-semibold leading-tight">
                          {item.title}
                        </div>
                      </div>
                      <div
                        className={`text-xs leading-tight ${active ? "text-claude-neutral-50/80" : "text-claude-neutral-500"}`}
                      >
                        {item.subtitle}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {loading ? <Skeleton.Avatar size={32} active /> : <UserInfo />}
          </div>
        </div>
      </div>
    </nav>
  );
}
