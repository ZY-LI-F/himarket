import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Button, Card, FormField, toast } from "../components/common";
import request from "../lib/request";
import { Layout } from "../components/Layout";

import "./authIntake.css";

const Register: React.FC = () => {
  const { t } = useTranslation("register");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // const location = useLocation()
  // const searchParams = new URLSearchParams(location.search)
  // const portalId = searchParams.get('portalId') || ''

  const handleRegister = async (values: {
    username: string;
    password: string;
    confirmPassword: string;
  }) => {
    setLoading(true);
    try {
      // 这里需要根据实际API调整
      await request.post("/developers", {
        username: values.username,
        password: values.password,
      });
      toast.success(t("registerSuccess"));
      // 注册成功后跳转到登录页
      navigate("/login");
    } catch {
      toast.error(t("registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="hm-intake-page">
        <div className="hm-intake-panel">
          <Card className="hm-intake-card">
            <div className="hm-intake-header">
              <h2 className="hm-intake-title">
                <span className="hm-intake-title-accent">{t("greeting")}</span>
                {t("hello")}
              </h2>
              <p className="hm-intake-description">{t("welcomeMessage")}</p>
            </div>

            <Form
              name="register"
              onFinish={handleRegister}
              autoComplete="off"
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: t("usernameRequired") },
                  { min: 3, message: t("usernameMinLength") },
                ]}
              >
                <FormField.Input
                  prefix={<UserOutlined className="hm-intake-icon" />}
                  placeholder={t("usernamePlaceholder")}
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: t("passwordRequired") },
                  { min: 6, message: t("passwordMinLength") },
                ]}
              >
                <FormField.Password
                  prefix={<LockOutlined className="hm-intake-icon" />}
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={["password"]}
                rules={[
                  { required: true, message: t("confirmPasswordRequired") },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(t("passwordMismatch")));
                    },
                  }),
                ]}
              >
                <FormField.Password
                  prefix={<LockOutlined className="hm-intake-icon" />}
                  placeholder={t("confirmPasswordPlaceholder")}
                  autoComplete="new-password"
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
                  {loading ? t("registering") : t("register")}
                </Button>
              </Form.Item>
            </Form>

            <div className="hm-intake-footer">
              {t("hasAccount")}
              <Link to="/login" className="hm-intake-link">
                {t("loginLink")}
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Register;
