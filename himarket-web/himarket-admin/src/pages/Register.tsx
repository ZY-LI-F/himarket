import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../lib/api'
import { Alert, Form } from 'antd'
import { Button, Card, FormField } from '@/components/common'

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  searchParams.get('portalId') || '';
  const handleRegister = async (values: { username: string; password: string; confirmPassword: string }) => {
    setError('')
    if (!values.username || !values.password || !values.confirmPassword) {
      setError('请填写所有字段')
      return
    }
    if (values.password !== values.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    setLoading(true)
    try {
      await api.post('/admins/init', { username: values.username, password: values.password })
      navigate('/login')
    } catch {
      setError('注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-neutral-50)] px-4 py-10 text-[var(--color-neutral-900)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-brand-surface-tint)] via-[var(--color-neutral-50)] to-[var(--color-neutral-100)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-[var(--radius-full)] bg-[var(--color-brand-surface-tint)] blur-3xl" />

      <Card className="relative z-10 w-full max-w-md border-[var(--color-neutral-200)] shadow-claude-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-brand-surface-tint)]">
            <img src="/logo.png" alt="Logo" className="h-10 w-10" />
          </div>
          <p className="mb-2 text-sm font-semibold text-[var(--color-brand)]">
            HiMarket Admin
          </p>
          <h2 className="text-2xl font-bold text-[var(--color-neutral-900)]">注册 AI Portal</h2>
        </div>
        <Form
          className="w-full"
          layout="vertical"
          onFinish={handleRegister}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <FormField.Input placeholder="账号" autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <FormField.Password placeholder="密码" autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            rules={[{ required: true, message: '请确认密码' }]}
          >
            <FormField.Password placeholder="确认密码" autoComplete="new-password" size="large" />
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
              注册
            </Button>
          </Form.Item>
        </Form>
        <div className="mt-6 w-full text-center text-sm text-[var(--color-neutral-500)]">
          已有账号？<Link to="/login" className="ml-1 text-[var(--color-brand)] hover:text-[var(--color-brand-hover)] hover:underline">登录</Link>
        </div>
      </Card>
    </div>
  )
}

export default Register
