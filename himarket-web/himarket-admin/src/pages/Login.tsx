import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { authApi } from '@/lib/api'
import { Alert, Form } from "antd";
import { Button, Card, FormField } from "@/components/common";

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState<boolean | null>(null); // null 表示正在加载
  const navigate = useNavigate();

  // 页面加载时检查权限
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authApi.getNeedInit(); // 替换为你的权限接口
        setIsRegister(response.data === true); // 根据接口返回值决定是否显示注册表单
      } catch (err) {
        setIsRegister(false); // 默认显示登录表单
      }
    };

    checkAuth();
  }, []);

  // 登录表单提交
  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/admins/login", {
        username: values.username,
        password: values.password,
      });
      const accessToken = response.data.access_token;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('userInfo', JSON.stringify(response.data));
      navigate('/portals');
    } catch {
      setError("账号或密码错误");
    } finally {
      setLoading(false);
    }
  };

  // 注册表单提交
  const handleRegister = async (values: { username: string; password: string; confirmPassword: string }) => {
    setLoading(true);
    setError("");
    if (values.password !== values.confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }
    try {
      const response = await api.post("/admins/init", {
        username: values.username,
        password: values.password,
      });
      if (response.data.adminId) {
        setIsRegister(false); // 初始化成功后切换到登录状态
      }
    } catch {
      setError("初始化失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[var(--color-neutral-50)] text-[var(--color-neutral-900)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-brand-surface-tint)] via-[var(--color-neutral-50)] to-[var(--color-neutral-100)]" />

      <div className="relative hidden w-1/2 overflow-hidden bg-[var(--color-neutral-900)] text-white md:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,var(--color-brand)_0,transparent_30%),radial-gradient(circle_at_82%_72%,var(--color-neutral-700)_0,transparent_34%)] opacity-40" />
        <div className="relative z-10 flex w-full flex-col justify-between p-12">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-white/10 ring-1 ring-white/15">
              <img src="/logo.png" alt="Logo" className="h-8 w-8" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/60">HiMarket</p>
              <h1 className="text-2xl font-bold">Admin Console</h1>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="mb-5 text-sm font-semibold uppercase tracking-wide text-[var(--color-brand-surface-tint)]">
              AI Open Platform
            </p>
            <p className="text-4xl font-bold leading-tight">
              统一管理企业级 AI 服务、门户与开放能力。
            </p>
            <p className="mt-6 max-w-md text-base leading-7 text-white/70">
              为管理员保留清晰的操作入口，以一致的后台视觉承接产品工作台。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm text-white/65">
            <div className="rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4">
              <p className="text-lg font-semibold text-white">API</p>
              <p className="mt-1">服务编排</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4">
              <p className="text-lg font-semibold text-white">Portal</p>
              <p className="mt-1">门户运营</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-white/10 bg-white/5 p-4">
              <p className="text-lg font-semibold text-white">IAM</p>
              <p className="mt-1">权限入口</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex w-full items-center justify-center px-4 py-10 md:w-1/2 md:px-10">
        <Card className="w-full max-w-md border-[var(--color-neutral-200)] shadow-claude-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-brand-surface-tint)] md:hidden">
              <img src="/logo.png" alt="Logo" className="h-10 w-10" />
            </div>
            <p className="mb-2 text-sm font-semibold text-[var(--color-brand)]">
              HiMarket Admin
            </p>
            <h2 className="text-2xl font-bold text-[var(--color-neutral-900)]">
              {isRegister ? "注册Admin账号" : "登录HiMarket-后台"}
            </h2>
          </div>

          {!isRegister && (
            <Form
              className="w-full"
              layout="vertical"
              onFinish={handleLogin}
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: "请输入账号" }]}
              >
                <FormField.Input placeholder="账号" size="large" />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <FormField.Password placeholder="密码" size="large" />
              </Form.Item>
              {error && <Alert message={error} type="error" showIcon className="mb-2" />}
              <Form.Item className="mb-0">
                <Button
                  variant="primary"
                  htmlType="submit"
                  className="w-full"
                  loading={loading}
                  size="large"
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          )}

          {isRegister && (
            <Form
              className="w-full"
              layout="vertical"
              onFinish={handleRegister}
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: "请输入账号" }]}
              >
                <FormField.Input placeholder="账号" size="large" />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <FormField.Password placeholder="密码" size="large" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                rules={[{ required: true, message: "请确认密码" }]}
              >
                <FormField.Password placeholder="确认密码" size="large" />
              </Form.Item>
              {error && <Alert message={error} type="error" showIcon className="mb-2" />}
              <Form.Item className="mb-0">
                <Button
                  variant="primary"
                  htmlType="submit"
                  className="w-full"
                  loading={loading}
                  size="large"
                >
                  初始化
                </Button>
              </Form.Item>
            </Form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;
