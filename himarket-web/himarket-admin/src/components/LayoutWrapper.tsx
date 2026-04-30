import React from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import Layout from "./Layout";
import { hasAdminAccess } from "@/access";

const LayoutWrapper: React.FC = () => {
  const location = useLocation();

  // 当前是否是登录页面
  const isLoginPage = location.pathname === "/login";

  // 未登录且不是登录页面 → 跳转到 /login
  if (!hasAdminAccess() && !isLoginPage) {
    return <Navigate to="/login" replace />;
  }

  // 如果是登录页面，直接渲染
  if (isLoginPage) {
    return <Outlet />;
  }

  return <Layout />;
};

export default LayoutWrapper;
