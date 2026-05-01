import { Button, Space, message } from 'antd'
import { SaveOutlined, UploadOutlined, FileMarkdownOutlined, EditOutlined } from '@ant-design/icons'
import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm';
import MdEditor from 'react-markdown-editor-lite'
import 'react-markdown-editor-lite/lib/index.css'
import type { ApiProduct } from '@/types/api-product'
import { apiProductApi } from '@/lib/api'
import { Card, Empty } from '@/components/common'

interface ApiProductUsageGuideProps {
  apiProduct: ApiProduct
  handleRefresh: () => void
}

export function ApiProductUsageGuide({ apiProduct, handleRefresh }: ApiProductUsageGuideProps) {
  const [content, setContent] = useState(apiProduct.document || '')
  const [isEditing, setIsEditing] = useState(false)
  const [originalContent, setOriginalContent] = useState(apiProduct.document || '')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    const categoryIds = apiProduct.categories?.map(cat => cat.categoryId) || [];

    setSaving(true)
    apiProductApi.updateApiProduct(apiProduct.productId, {
      document: content,
      categories: categoryIds
    }).then(() => {
      message.success('保存成功')
      setIsEditing(false)
      setOriginalContent(content)
      handleRefresh();
    }).finally(() => {
      setSaving(false)
    })
  }

  const handleCancel = () => {
    setContent(originalContent)
    setIsEditing(false)
  }

  const handleEditorChange = ({ text }: { text: string }) => {
    setContent(text)
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/markdown' && !file.name.endsWith('.md')) {
        message.error('请选择 Markdown 文件 (.md)')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setContent(content)
        setIsEditing(true)
        message.success('文件导入成功')
      }
      reader.readAsText(file)
    }
    if (event.target) {
      event.target.value = ''
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">使用指南</h1>
          <p className="text-claude-neutral-600">编辑和发布使用指南</p>
        </div>
        <Space>
          {isEditing ? (
            <>
              <Button icon={<UploadOutlined />} onClick={triggerFileInput}>
                导入文件
              </Button>
              <Button onClick={handleCancel}>
                取消
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                保存
              </Button>
            </>
          ) : (
            <>
              <Button icon={<UploadOutlined />} onClick={triggerFileInput}>
                导入文件
              </Button>
              <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
                编辑
              </Button>
            </>
          )}
        </Space>
      </div>

      <Card>
        {isEditing ? (
          <>
            <MdEditor
              value={content}
              onChange={handleEditorChange}
              style={{ height: '600px', width: '100%' }}
              placeholder="请输入使用指南内容..."
              renderHTML={(text) => <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>}
              canView={{ menu: true, md: true, html: true, both: true, fullScreen: false, hideMenu: false }}
              htmlClass="custom-html-style"
              markdownClass="custom-markdown-style"
            />
            <div className="mt-4 text-sm text-claude-neutral-500">
              💡 支持Markdown格式：代码块、表格、链接、图片等语法
            </div>
          </>
        ) : (
          <div className="min-h-[400px]">
            {content ? (
              <div
                className="prose prose-lg max-w-none"
                style={{
                  lineHeight: '1.7',
                  color: 'var(--color-neutral-700)',
                  fontSize: '16px',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                <style>{`
                  .prose h1 { color: var(--color-neutral-900); font-weight: 700; font-size: 2.25rem; line-height: 1.2; margin-top: 0; margin-bottom: 1.5rem; border-bottom: 2px solid var(--color-neutral-200); padding-bottom: 0.5rem; }
                  .prose h2 { color: var(--color-neutral-800); font-weight: 600; font-size: 1.875rem; line-height: 1.3; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 1px solid var(--color-neutral-200); padding-bottom: 0.25rem; }
                  .prose h3 { color: var(--color-neutral-700); font-weight: 600; font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
                  .prose p { margin-bottom: 1.25rem; color: var(--color-neutral-600); line-height: 1.7; font-size: 16px; }
                  .prose code { background-color: var(--color-neutral-100); border: 1px solid var(--color-neutral-200); border-radius: 0.375rem; padding: 0.125rem 0.375rem; font-size: 0.875rem; color: var(--color-neutral-700); font-weight: 500; }
                  .prose pre { background-color: var(--color-neutral-800); border-radius: 0.5rem; padding: 1.25rem; overflow-x: auto; margin: 1.5rem 0; border: 1px solid var(--color-neutral-700); }
                  .prose pre code { background-color: transparent; border: none; color: var(--color-neutral-50); padding: 0; font-size: 0.875rem; font-weight: normal; }
                  .prose blockquote { border-left: 4px solid var(--color-brand); padding-left: 1rem; margin: 1.5rem 0; color: var(--color-neutral-500); font-style: italic; background-color: var(--color-neutral-50); padding: 1rem; border-radius: 0.375rem; font-size: 16px; }
                  .prose ul, .prose ol { margin: 1.25rem 0; padding-left: 1.5rem; }
                  .prose ol { list-style-type: decimal; list-style-position: outside; }
                  .prose ul { list-style-type: disc; list-style-position: outside; }
                  .prose li { margin: 0.5rem 0; color: var(--color-neutral-600); display: list-item; font-size: 16px; }
                  .prose ol li { padding-left: 0.25rem; }
                  .prose ul li { padding-left: 0.25rem; }
                  .prose table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 16px; }
                  .prose th, .prose td { border: 1px solid var(--color-neutral-300); padding: 0.75rem; text-align: left; }
                  .prose th { background-color: var(--color-neutral-50); font-weight: 600; color: var(--color-neutral-700); font-size: 16px; }
                  .prose td { color: var(--color-neutral-600); font-size: 16px; }
                  .prose a { color: var(--color-brand); text-decoration: underline; font-weight: 500; transition: color 0.2s; font-size: inherit; }
                  .prose a:hover { color: var(--color-brand-hover); }
                  .prose strong { color: var(--color-neutral-900); font-weight: 600; font-size: inherit; }
                  .prose em { color: var(--color-neutral-500); font-style: italic; font-size: inherit; }
                  .prose hr { border: none; height: 1px; background-color: var(--color-neutral-200); margin: 2rem 0; }
                `}</style>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <Empty
                image={<FileMarkdownOutlined className="text-4xl text-claude-neutral-300" />}
                description="暂无使用指南"
                action={<span className="text-sm text-claude-neutral-500">点击编辑按钮开始撰写</span>}
              />
            )}
          </div>
        )}
      </Card>

      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,text/markdown"
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />
    </div>
  )
}
