import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ApiOutlined,
  BarChartOutlined,
  BulbOutlined,
  DashboardOutlined,
  DesktopOutlined,
  HomeOutlined,
  MonitorOutlined,
  ProductOutlined,
  RobotOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Layout as AntLayout } from "antd";

import { colors } from "../../../shared/design-tokens/colors";
import { spacing } from "../../../shared/design-tokens/spacing";
import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import Sidebar, { type NavigationItem } from "@/components/common/Sidebar";
import McpServerIcon from "@/components/icons/McpServerIcon";
import { isAuthenticated, removeToken } from "../lib/utils";

const API_PRODUCT_SUB_ROUTES = [
  "model-api",
  "mcp-server",
  "agent-skill",
  "worker",
  "agent-api",
  "rest-api",
] as const;

const navigation: readonly NavigationItem[] = [
  { name: "Portal", cn: "门户", href: "/portals", icon: HomeOutlined },
  {
    name: "API Products",
    cn: "API产品",
    href: "/api-products",
    icon: ProductOutlined,
    children: [
      {
        name: "Model API",
        cn: "Model API",
        href: "/api-products/model-api",
        icon: BulbOutlined,
      },
      {
        name: "MCP Server",
        cn: "MCP Server",
        href: "/api-products/mcp-server",
        icon: McpServerIcon,
      },
      {
        name: "Agent Skill",
        cn: "Agent Skill",
        href: "/api-products/agent-skill",
        icon: ThunderboltOutlined,
      },
      {
        name: "Worker",
        cn: "Worker",
        href: "/api-products/worker",
        icon: UserOutlined,
      },
      {
        name: "Agent API",
        cn: "Agent API",
        href: "/api-products/agent-api",
        icon: RobotOutlined,
      },
      {
        name: "REST API",
        cn: "REST API",
        href: "/api-products/rest-api",
        icon: ApiOutlined,
      },
    ],
  },
  {
    name: "Categories",
    cn: "产品类别",
    href: "/product-categories",
    icon: TagsOutlined,
  },
  {
    name: "Worker Team Products",
    cn: "Worker Team 产品",
    href: "/worker-team-products",
    icon: TeamOutlined,
  },
  {
    name: "实例管理",
    cn: "实例管理",
    href: "/consoles",
    icon: SettingOutlined,
    children: [
      {
        name: "Nacos实例",
        cn: "Nacos实例",
        href: "/consoles/nacos",
        icon: DesktopOutlined,
      },
      {
        name: "网关实例",
        cn: "网关实例",
        href: "/consoles/gateway",
        icon: DesktopOutlined,
      },
      {
        name: "Sandbox实例",
        cn: "Sandbox实例",
        href: "/consoles/sandbox",
        icon: DesktopOutlined,
      },
    ],
  },
  {
    name: "观测分析",
    cn: "观测分析",
    href: "/observability",
    icon: BarChartOutlined,
    children: [
      {
        name: "模型监控",
        cn: "模型监控",
        href: "/observability/model-dashboard",
        icon: DashboardOutlined,
      },
      {
        name: "MCP监控",
        cn: "MCP监控",
        href: "/observability/mcp-monitor",
        icon: MonitorOutlined,
      },
    ],
  },
] as const;

const shellStyle = {
  minHeight: "100vh",
  background: colors.neutral[100],
};

const bodyStyle = {
  minHeight: "calc(100vh - 72px)",
  background: colors.neutral[100],
};

const contentWrapStyle = {
  minHeight: "calc(100vh - 72px)",
  minWidth: 0,
  background: `linear-gradient(180deg, ${colors.neutral[50]} 0%, ${colors.neutral[100]} 100%)`,
};

const contentStyle = {
  minHeight: "calc(100vh - 136px)",
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden" as const,
  padding: spacing[32],
};

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuthStatus = () => {
      setIsLoggedIn(isAuthenticated());
    };

    checkAuthStatus();
    window.addEventListener("storage", checkAuthStatus);

    return () => {
      window.removeEventListener("storage", checkAuthStatus);
    };
  }, []);

  useEffect(() => {
    const apiProductDetailMatch = location.pathname.match(
      /^\/api-products\/([^/]+)$/
    );
    const isApiProductSubRoute =
      apiProductDetailMatch !== null &&
      API_PRODUCT_SUB_ROUTES.includes(
        apiProductDetailMatch[1] as (typeof API_PRODUCT_SUB_ROUTES)[number]
      );
    const shouldCollapse =
      location.pathname.match(/^\/portals\/[^/]+$/) !== null ||
      (apiProductDetailMatch !== null && !isApiProductSubRoute);

    setSidebarCollapsed(shouldCollapse);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarCollapsed(currentValue => !currentValue);
  };

  const handleLogout = () => {
    removeToken();
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <AntLayout style={shellStyle}>
      <Header
        isLoggedIn={isLoggedIn}
        sidebarCollapsed={sidebarCollapsed}
        onLogin={() => navigate("/login")}
        onLogout={handleLogout}
        onToggleSidebar={toggleSidebar}
      />
      <AntLayout style={bodyStyle}>
        <Sidebar
          collapsed={sidebarCollapsed}
          navigation={navigation}
          pathname={location.pathname}
        />
        <AntLayout style={contentWrapStyle}>
          <AntLayout.Content style={contentStyle}>
            <Outlet />
          </AntLayout.Content>
          <Footer />
        </AntLayout>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
