import { createBrowserRouter, Navigate, redirect } from 'react-router-dom';

import LayoutWrapper from '@/components/LayoutWrapper';
import ApiProductDetail from '@/pages/ApiProductDetail';
import GatewayConsoles from '@/pages/GatewayConsoles';
import KnowledgeDetailPage from '@/pages/Knowledge/KnowledgeDetailPage';
import KnowledgeEditorPage from '@/pages/Knowledge/KnowledgeEditorPage';
import KnowledgeListPage from '@/pages/Knowledge/KnowledgeListPage';
import Login from '@/pages/Login';
import McpMonitor from '@/pages/McpMonitor';
import ModelDashboard from '@/pages/ModelDashboard';
import NacosConsoles from '@/pages/NacosConsoles';
import PortalDetail from '@/pages/PortalDetail';
import Portals from '@/pages/Portals';
import ProductCategories from '@/pages/ProductCategories';
import ProductCategoryDetail from '@/pages/ProductCategoryDetail';
import ProductTypePage from '@/pages/ProductTypePage';
import SandboxConsoles from '@/pages/SandboxConsoles';
import TemplateListPage from '@/pages/Templates/TemplateListPage';

type AdminAuthStatus = 'admin' | 'non-admin' | 'unauthenticated';

interface JwtPayload {
  userType?: unknown;
}

const decodeBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return window.atob(`${base64}${padding}`);
};

const parseJwtPayload = (token: string): JwtPayload | null => {
  const payloadPart = token.split('.')[1];
  if (!payloadPart) {
    return null;
  }

  const payload: unknown = JSON.parse(decodeBase64Url(payloadPart));
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  return payload as JwtPayload;
};

const getAdminAuthStatus = (): AdminAuthStatus => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return 'unauthenticated';
  }

  try {
    const payload = parseJwtPayload(token);
    if (!payload) {
      return 'unauthenticated';
    }

    return payload.userType === 'ADMIN' ? 'admin' : 'non-admin';
  } catch (error) {
    console.warn('Invalid admin auth token:', error);
    return 'unauthenticated';
  }
};

const requireAdminLoader = () => {
  if (getAdminAuthStatus() !== 'admin') {
    throw redirect('/login');
  }

  return null;
};

const adminRoutePage = (title: string) => (
  <section>
    <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
  </section>
);

export const router = createBrowserRouter([
  {
    element: <Login />,
    path: '/login',
  },
  {
    children: [
      {
        element: <Navigate replace to="/portals" />,
        index: true,
      },
      {
        element: <Portals />,
        path: 'portals',
      },
      {
        element: <PortalDetail />,
        path: 'portals/:portalId',
      },
      {
        children: [
          {
            element: <Navigate replace to="/api-products/model-api" />,
            index: true,
          },
          {
            element: <ProductTypePage productType="MODEL_API" />,
            path: 'model-api',
          },
          {
            element: <ProductTypePage productType="MCP_SERVER" />,
            path: 'mcp-server',
          },
          {
            element: <ProductTypePage productType="AGENT_SKILL" />,
            path: 'agent-skill',
          },
          {
            element: <ProductTypePage productType="WORKER" />,
            path: 'worker',
          },
          {
            element: <ProductTypePage productType="AGENT_API" />,
            path: 'agent-api',
          },
          {
            element: <ProductTypePage productType="REST_API" />,
            path: 'rest-api',
          },
          {
            element: <ApiProductDetail />,
            path: ':productId',
          },
        ],
        path: 'api-products',
      },
      {
        element: <ProductCategories />,
        path: 'product-categories',
      },
      {
        element: <ProductCategoryDetail />,
        path: 'product-categories/:categoryId',
      },
      {
        element: <Navigate replace to="/consoles/gateway" />,
        path: 'consoles',
      },
      {
        element: <GatewayConsoles />,
        path: 'consoles/gateway',
      },
      {
        element: <NacosConsoles />,
        path: 'consoles/nacos',
      },
      {
        element: <SandboxConsoles />,
        path: 'consoles/sandbox',
      },
      {
        element: <Navigate replace to="/observability/model-dashboard" />,
        path: 'observability',
      },
      {
        element: <ModelDashboard />,
        path: 'observability/model-dashboard',
      },
      {
        element: <McpMonitor />,
        path: 'observability/mcp-monitor',
      },
      {
        element: <KnowledgeListPage />,
        loader: requireAdminLoader,
        path: 'admin/knowledge',
      },
      {
        element: <KnowledgeEditorPage />,
        loader: requireAdminLoader,
        path: 'admin/knowledge/new',
      },
      {
        element: <KnowledgeDetailPage />,
        loader: requireAdminLoader,
        path: 'admin/knowledge/:knowledgeId',
      },
      {
        element: <KnowledgeEditorPage />,
        loader: requireAdminLoader,
        path: 'admin/knowledge/:knowledgeId/edit',
      },
      {
        element: <TemplateListPage />,
        loader: requireAdminLoader,
        path: 'admin/templates',
      },
      {
        element: adminRoutePage('术语表'),
        loader: requireAdminLoader,
        path: 'admin/glossaries',
      },
      {
        element: adminRoutePage('项目'),
        loader: requireAdminLoader,
        path: 'admin/projects',
      },
      {
        element: <Navigate replace to="/portals" />,
        path: '*',
      },
    ],
    element: <LayoutWrapper />,
    path: '/',
  },
]);
