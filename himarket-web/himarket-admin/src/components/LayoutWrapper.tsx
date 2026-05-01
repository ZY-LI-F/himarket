import { Navigate, Outlet, useLocation } from "react-router-dom";

import Layout from "./Layout";
import { isAuthenticated } from "../lib/utils";

const loginPath = "/login";

const LayoutWrapper = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === loginPath;

  if (!isAuthenticated() && !isLoginPage) {
    return <Navigate replace to={loginPath} />;
  }

  if (isLoginPage) {
    return <Outlet />;
  }

  return <Layout />;
};

export default LayoutWrapper;
