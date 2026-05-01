import { Modal, Radio, Button, Space } from 'antd'
import { useState } from 'react'

export type NacosImportType = 'OPEN_SOURCE' | 'MSE'

interface NacosTypeSelectorProps {
  visible: boolean
  onCancel: () => void
  onSelect: (type: NacosImportType) => void
}

const optionClassName =
  'w-full rounded-claude-md border border-claude-neutral-200 bg-claude-neutral-50 p-3 transition-colors hover:border-claude-brand-primary/40 hover:bg-claude-brand-surfaceTint/50'

export default function NacosTypeSelector({ visible, onCancel, onSelect }: NacosTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<NacosImportType>('MSE')

  const handleConfirm = () => {
    onSelect(selectedType)
  }

  const handleCancel = () => {
    setSelectedType('OPEN_SOURCE')
    onCancel()
  }

  return (
    <Modal
      title="选择 Nacos 类型"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>
          确定
        </Button>
      ]}
      width={500}
    >
      <div className="py-4 text-claude-neutral-900">
        <Radio.Group 
          value={selectedType} 
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full"
        >
          <Space direction="vertical" className="w-full">
            <Radio value="MSE" className={optionClassName}>
              <div className="ml-2">
                <div className="font-medium">MSE Nacos</div>
                <div className="text-sm text-claude-neutral-600">通过阿里云 MSE 账号授权后选择实例导入</div>
              </div>
            </Radio>
            <Radio value="OPEN_SOURCE" className={optionClassName}>
              <div className="ml-2">
                <div className="font-medium">开源 Nacos</div>
                <div className="text-sm text-claude-neutral-600">使用已有自建/开源 Nacos 地址登录创建</div>
              </div>
            </Radio>
          </Space>
        </Radio.Group>
      </div>
    </Modal>
  )
}
