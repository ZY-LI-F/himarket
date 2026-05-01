import { Card, Table, Button, Space, Avatar, Tag, Input } from 'antd'
import { SearchOutlined, UserAddOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { Portal, DeveloperStats } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { semanticTagStyle, type SemanticTone } from '@/lib/semanticStyles'

interface PortalConsumersProps {
  portal: Portal
}

const mockConsumers: DeveloperStats[] = [
  {
    id: "1",
    name: "企业A",
    email: "contact@company-a.com",
    status: "active",
    plan: "premium",
    joinedAt: "2025-01-01T10:00:00Z",
    lastActive: "2025-01-08T15:30:00Z",
    apiCalls: 15420,
    subscriptions: 3
  },
  {
    id: "2",
    name: "企业B",
    email: "dev@company-b.com",
    status: "active",
    plan: "standard",
    joinedAt: "2025-01-02T11:00:00Z",
    lastActive: "2025-01-08T14:20:00Z",
    apiCalls: 8765,
    subscriptions: 2
  },
  {
    id: "3",
    name: "企业C",
    email: "api@company-c.com",
    status: "inactive",
    plan: "basic",
    joinedAt: "2025-01-03T12:00:00Z",
    lastActive: "2025-01-05T09:15:00Z",
    apiCalls: 1200,
    subscriptions: 1
  }
]

export function PortalConsumers({ portal }: PortalConsumersProps) {
  const [consumers, setConsumers] = useState<DeveloperStats[]>(mockConsumers)
  const [searchText, setSearchText] = useState('')

  const filteredConsumers = consumers.filter(consumer =>
    consumer.name.toLowerCase().includes(searchText.toLowerCase()) ||
    consumer.email.toLowerCase().includes(searchText.toLowerCase())
  )

  const getPlanTone = (plan: string): SemanticTone => {
    switch (plan) {
      case 'premium':
        return 'warning'
      case 'standard':
        return 'info'
      case 'basic':
        return 'success'
      default:
        return 'info'
    }
  }

  const getPlanText = (plan: string) => {
    switch (plan) {
      case 'premium':
        return '高级版'
      case 'standard':
        return '标准版'
      case 'basic':
        return '基础版'
      default:
        return plan
    }
  }

  const columns = [
    {
      title: '消费者',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DeveloperStats) => (
        <div className="flex items-center space-x-3">
          <Avatar className="bg-claude-semantic-success">
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div className="font-semibold text-claude-neutral-900">{name}</div>
            <div className="text-sm text-claude-neutral-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag style={semanticTagStyle(status === 'active' ? 'success' : 'warning')}>
          {status === 'active' ? '活跃' : '非活跃'}
        </Tag>
      )
    },
    {
      title: '套餐',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan: string) => (
        <Tag style={semanticTagStyle(getPlanTone(plan))}>
          {getPlanText(plan)}
        </Tag>
      )
    },
    {
      title: 'API调用',
      dataIndex: 'apiCalls',
      key: 'apiCalls',
      render: (calls: number) => calls.toLocaleString()
    },
    {
      title: '订阅数',
      dataIndex: 'subscriptions',
      key: 'subscriptions',
      render: (subscriptions: number) => subscriptions.toLocaleString()
    },
    {
      title: '加入时间',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (date: string) => formatDateTime(date)
    },
    {
      title: '最后活跃',
      dataIndex: 'lastActive',
      key: 'lastActive',
      render: (date: string) => formatDateTime(date)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DeveloperStats) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6 text-claude-neutral-900">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">消费者</h1>
          <p className="text-claude-neutral-600">管理Portal的消费者用户</p>
        </div>
        <Button type="primary" icon={<UserAddOutlined />}>
          添加消费者
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="搜索消费者..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>
        <Table 
          columns={columns} 
          dataSource={filteredConsumers}
          rowKey="id"
          pagination={false}
        />
      </Card>

    </div>
  )
}
