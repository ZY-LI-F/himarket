import { Alert, Button, Form, Input, Select, Space, Steps, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../lib/api';

const ICH_OPTIONS = [
  { label: 'ICH-E3 (CSR)', value: 'ICH-E3' },
  { label: 'ICH-E6-R3 (GCP)', value: 'ICH-E6-R3' },
  { label: 'ICH-E8-R1 (General)', value: 'ICH-E8-R1' },
  { label: 'ICH-E9 (Statistics)', value: 'ICH-E9' },
];

const CATEGORY_OPTIONS = [
  { label: 'CSR 写作', value: 'csr_authoring' },
  { label: 'CSR 校验', value: 'csr_review' },
  { label: 'Protocol 写作', value: 'protocol_authoring' },
];

interface DirectionForm {
  title: string;
  category: string;
  ichSpec?: string;
  disease?: string;
  drug?: string;
  endpoints?: string;
  studyType?: string;
}

const ProjectWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<DirectionForm | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<DirectionForm>();

  const handleDirectionNext = (values: DirectionForm) => {
    setDirection(values);
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!direction) return;
    setSubmitting(true);
    try {
      const res = await api.post('/projects', {
        title: direction.title,
        category: direction.category,
        ichSpec: direction.ichSpec,
        direction: {
          disease: direction.disease,
          drug: direction.drug,
          endpoints:
            direction.endpoints
              ?.split(',')
              .map((s) => s.trim())
              .filter(Boolean) ?? [],
          design: { studyType: direction.studyType },
        },
      });
      const projectId = res?.data?.data?.id ?? res?.data?.id;
      message.success('项目创建成功');
      if (projectId) navigate(`/me/projects/${projectId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', padding: '0 24px' }}>
      <h1>新建撰写项目</h1>
      <Steps
        current={step}
        items={[
          { description: '疾病/药物/终点', title: '撰写方向' },
          { description: 'ICH 章节', title: '选择模板' },
          { description: '上传/挂接', title: '附件 + PubMed' },
          { description: '派发到 worker', title: '提交' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {step === 0 && (
        <Form
          form={form}
          initialValues={{ category: 'csr_authoring' }}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 16 }}
          onFinish={handleDirectionNext}
        >
          <Form.Item label="项目标题" name="title" rules={[{ required: true }]}>
            <Input placeholder="例如 NSCLC pembrolizumab III 期 CSR" />
          </Form.Item>
          <Form.Item label="项目类型" name="category" rules={[{ required: true }]}>
            <Select options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item label="ICH spec" name="ichSpec">
            <Select allowClear options={ICH_OPTIONS} placeholder="选填" />
          </Form.Item>
          <Form.Item label="疾病" name="disease">
            <Input placeholder="例如 non-small cell lung cancer" />
          </Form.Item>
          <Form.Item label="药物" name="drug">
            <Input placeholder="例如 pembrolizumab" />
          </Form.Item>
          <Form.Item label="终点指标" name="endpoints" tooltip="多个用逗号分隔">
            <Input placeholder="overall survival, progression-free survival" />
          </Form.Item>
          <Form.Item label="研究类型" name="studyType">
            <Input placeholder="例如 randomized controlled trial" />
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 6 }}>
            <Button htmlType="submit" type="primary">
              下一步
            </Button>
          </Form.Item>
        </Form>
      )}

      {step >= 1 && (
        <div>
          <Alert
            message="后续步骤（章节选择 / 附件挂接 / PubMed 检索）暂未在此 stub 实现，可在创建项目后到 ProjectWorkspacePage 继续操作。"
            style={{ marginBottom: 16 }}
            type="info"
          />
          <Space>
            <Button onClick={() => setStep(step - 1)}>上一步</Button>
            <Button loading={submitting} type="primary" onClick={handleSubmit}>
              {submitting ? '创建中...' : '提交并派发'}
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

export default ProjectWizard;
