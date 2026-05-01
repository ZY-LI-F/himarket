import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Divider, Form } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Button, Card, FormField, toast } from "../components/common";
import request from "../lib/request";
import type { IIdpProvider } from "../lib/apis";
import { AxiosError } from "axios";
import { Layout } from "../components/Layout";
import APIs from "../lib/apis";

import aliyunIcon from "../assets/aliyun.png";
import githubIcon from "../assets/github.png";
import googleIcon from "../assets/google.png";

import "./authIntake.css";

const oidcIcons: Record<string, React.ReactNode> = {
  google: (
    <img
      src={googleIcon}
      alt="Google"
      className="hm-intake-provider-icon hm-intake-provider-icon--google"
    />
  ),
  github: (
    <img src={githubIcon} alt="GitHub" className="hm-intake-provider-icon" />
  ),
  aliyun: (
    <img src={aliyunIcon} alt="Aliyun" className="hm-intake-provider-icon" />
  ),
};

const Login: React.FC = () => {
  const { t } = useTranslation("login");
  const [providers, setProviders] = useState<IIdpProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // 使用OidcController的接口获取OIDC提供商
    APIs.getOidcProviders()
      .then(({ data }) => {
        console.log("OIDC providers response:", data);
        setProviders(data);
      })
      .catch(error => {
        console.error("Failed to fetch OIDC providers:", error);
        setProviders([]);
      });
  }, []);

  // 账号密码登录
  const handlePasswordLogin = async (values: {
    username: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const res = await request.post("/developers/login", {
        username: values.username,
        password: values.password,
      });
      // 登录成功后跳转到首页并携带access_token
      if (res && res.data && res.data.access_token) {
        toast.success({ content: t("loginSuccess"), duration: 1 });
        localStorage.setItem("access_token", res.data.access_token);

        // 检查URL中是否有returnUrl参数
        const returnUrl = searchParams.get("returnUrl");
        if (returnUrl) {
          navigate(decodeURIComponent(returnUrl));
        } else {
          navigate("/");
        }
      } else {
        toast.error(t("loginFailedNoToken"));
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data.message || t("loginFailedCheckCredentials")
        );
      } else {
        toast.error(t("loginFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  // 跳转到 OIDC 授权 - 对接OidcController
  const handleOidcLogin = (provider: string) => {
    // 获取API前缀配置
    const apiPrefix = request.defaults.baseURL || "/api/v1";

    // 构建授权URL - 对接 /developers/oidc/authorize
    const authUrl = new URL(
      `${window.location.origin}${apiPrefix}/developers/oidc/authorize`
    );
    authUrl.searchParams.set("provider", provider);

    console.log("Redirecting to OIDC authorization:", authUrl.toString());

    // 跳转到OIDC授权服务器
    window.location.href = authUrl.toString();
  };

  return (
    <Layout>
      <div className="hm-intake-page">
        <div className="hm-intake-panel">
          {/* 登录卡片 */}
          <Card className="hm-intake-card">
            <div className="hm-intake-header">
              <h2 className="hm-intake-title">
                <span className="hm-intake-title-accent">{t("greeting")}</span>
                {t("hello")}
              </h2>
              <p className="hm-intake-description">{t("welcomeMessage")}</p>
            </div>

            {/* 账号密码登录表单 */}
            <Form
              name="login"
              onFinish={handlePasswordLogin}
              autoComplete="off"
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: t("usernameRequired") }]}
              >
                <FormField.Input
                  prefix={<UserOutlined className="hm-intake-icon" />}
                  placeholder={t("usernamePlaceholder")}
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: t("passwordRequired") }]}
              >
                <FormField.Password
                  prefix={<LockOutlined className="hm-intake-icon" />}
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  variant="primary"
                  htmlType="submit"
                  loading={loading}
                  className="hm-intake-submit"
                  size="large"
                >
                  {loading ? t("loggingIn") : t("login")}
                </Button>
              </Form.Item>
            </Form>
            {/* 分隔线 */}
            {providers.length > 0 && (
              <Divider plain className="hm-intake-divider">
                {t("or")}
              </Divider>
            )}
            {/* OIDC 登录按钮 */}
            <div className="hm-intake-provider-list">
              {providers.length === 0
                ? null
                : providers.map(provider => (
                    <Button
                      key={provider.provider}
                      onClick={() => handleOidcLogin(provider.provider)}
                      className="hm-intake-provider-button"
                      size="large"
                      icon={
                        oidcIcons[provider.provider.toLowerCase()] || (
                          <span></span>
                        )
                      }
                    >
                      {t("loginWithProvider", {
                        provider: provider.name || provider.provider,
                      })}
                    </Button>
                  ))}
            </div>
            <div className="hm-intake-footer">
              {t("noAccount")}
              <Link to="/register" className="hm-intake-link">
                {t("registerLink")}
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
