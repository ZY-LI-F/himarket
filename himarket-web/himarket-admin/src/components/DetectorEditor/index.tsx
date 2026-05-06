import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { useMemo, useState } from 'react';

import {
  DETECTOR_TYPE_OPTIONS,
  appendDetector,
  changeDetectorType,
  cloneDetectors,
  getDetectorLabel,
  getDetectorType,
  getKeywordDetectorValues,
  getRegexDetectorValues,
  getSemanticDetectorValues,
  isKnownDetectorType,
  mergeDetectorFields,
  removeDetectorAt,
  updateDetectorAt,
} from './detectorEditorUtils';

import type { DetectorConfig, DetectorEditorProps, KnownDetectorType } from './detectorTypes';
import type { CSSProperties } from 'react';

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function DetectorEditor({
  className,
  defaultValue = [],
  detectors,
  disabled = false,
  onChange,
  onDetectorsChange,
  readonly: readOnly = false,
  style,
  value,
}: DetectorEditorProps) {
  const { token } = theme.useToken();
  const [internalDetectors, setInternalDetectors] = useState<DetectorConfig[]>(() =>
    cloneDetectors(defaultValue),
  );

  const externalDetectors = value ?? detectors;
  const isControlled = externalDetectors !== undefined;
  const currentDetectors = useMemo(
    () => cloneDetectors(externalDetectors ?? internalDetectors),
    [externalDetectors, internalDetectors],
  );
  const editorDisabled = disabled || readOnly;

  const baseStyle: CSSProperties = {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    padding: token.padding,
  };
  const containerStyle = style ? { ...baseStyle, ...style } : baseStyle;
  const fullWidthStyle: CSSProperties = { width: '100%' };
  const headerStyle: CSSProperties = {
    alignItems: 'center',
    display: 'flex',
    gap: token.marginSM,
    justifyContent: 'space-between',
  };

  const emitChange = (nextDetectors: readonly DetectorConfig[]) => {
    const clonedDetectors = cloneDetectors(nextDetectors);

    if (!isControlled) {
      setInternalDetectors(clonedDetectors);
    }

    onChange?.(cloneDetectors(clonedDetectors));
    onDetectorsChange?.(cloneDetectors(clonedDetectors));
  };

  const handleAddDetector = () => {
    emitChange(appendDetector(currentDetectors));
  };

  const handleRemoveDetector = (index: number) => {
    emitChange(removeDetectorAt(currentDetectors, index));
  };

  const handleUpdateDetector = (index: number, fields: Readonly<Record<string, unknown>>) => {
    emitChange(
      updateDetectorAt(currentDetectors, index, (detector) =>
        mergeDetectorFields(detector, fields),
      ),
    );
  };

  const handleUpdateDetectorType = (index: number, nextType: string) => {
    if (!isKnownDetectorType(nextType)) {
      throw new Error(`Unsupported detector type: ${nextType}`);
    }

    emitChange(
      updateDetectorAt(currentDetectors, index, (detector) =>
        changeDetectorType(detector, nextType),
      ),
    );
  };

  const renderDescriptionField = (detector: DetectorConfig, index: number) => (
    <Form.Item label="说明">
      <Input.TextArea
        autoSize={{ minRows: 2 }}
        disabled={editorDisabled}
        onChange={(event) => handleUpdateDetector(index, { description: event.target.value })}
        placeholder="描述这个检测器的触发意图"
        value={toText(detector.description)}
      />
    </Form.Item>
  );

  const renderKeywordFields = (detector: DetectorConfig, index: number) => {
    const { caseSensitive, keywords } = getKeywordDetectorValues(detector);

    return (
      <>
        <Form.Item label="关键词">
          <Select
            disabled={editorDisabled}
            mode="tags"
            onChange={(nextKeywords) => handleUpdateDetector(index, { keywords: nextKeywords })}
            placeholder="输入关键词后按回车"
            style={fullWidthStyle}
            tokenSeparators={[',']}
            value={keywords}
          />
        </Form.Item>
        <Form.Item label="区分大小写">
          <Switch
            checked={caseSensitive}
            disabled={editorDisabled}
            onChange={(checked) => handleUpdateDetector(index, { case_sensitive: checked })}
          />
        </Form.Item>
      </>
    );
  };

  const renderRegexFields = (detector: DetectorConfig, index: number) => {
    const { flags, pattern } = getRegexDetectorValues(detector);

    return (
      <>
        <Form.Item label="表达式">
          <Input
            disabled={editorDisabled}
            onChange={(event) => handleUpdateDetector(index, { pattern: event.target.value })}
            placeholder="例如 ^Section\\s+\\d+"
            value={pattern}
          />
        </Form.Item>
        <Form.Item label="Flags">
          <Input
            disabled={editorDisabled}
            onChange={(event) => handleUpdateDetector(index, { flags: event.target.value })}
            placeholder="例如 i 或 gm"
            value={flags}
          />
        </Form.Item>
      </>
    );
  };

  const renderSemanticFields = (detector: DetectorConfig, index: number) => {
    const { instruction, threshold } = getSemanticDetectorValues(detector);

    return (
      <>
        <Form.Item label="语义说明">
          <Input.TextArea
            autoSize={{ minRows: 3 }}
            disabled={editorDisabled}
            onChange={(event) => handleUpdateDetector(index, { instruction: event.target.value })}
            placeholder="说明要检测的语义条件"
            value={instruction}
          />
        </Form.Item>
        <Form.Item label="阈值">
          <InputNumber
            disabled={editorDisabled}
            max={1}
            min={0}
            onChange={(nextThreshold) =>
              handleUpdateDetector(index, { threshold: nextThreshold ?? 0 })
            }
            step={0.05}
            style={fullWidthStyle}
            value={threshold}
          />
        </Form.Item>
      </>
    );
  };

  const renderDetectorFields = (detector: DetectorConfig, index: number) => {
    const detectorType = getDetectorType(detector);

    if (detectorType === 'keyword') {
      return renderKeywordFields(detector, index);
    }

    if (detectorType === 'regex') {
      return renderRegexFields(detector, index);
    }

    if (detectorType === 'semantic') {
      return renderSemanticFields(detector, index);
    }

    return (
      <Alert
        message={`不支持直接编辑 ${detectorType} 类型检测器，请在 YAML 视图中修改。`}
        showIcon
        type="warning"
      />
    );
  };

  const renderDetectorCard = (detector: DetectorConfig, index: number) => {
    const detectorType = getDetectorType(detector);
    const typeValue: KnownDetectorType | string = isKnownDetectorType(detectorType)
      ? detectorType
      : detectorType;

    return (
      <Card
        extra={
          !readOnly && (
            <Tooltip title="删除检测器">
              <Button
                aria-label="删除检测器"
                danger
                disabled={disabled}
                icon={<DeleteOutlined />}
                onClick={() => handleRemoveDetector(index)}
                size="small"
                type="text"
              />
            </Tooltip>
          )
        }
        key={`${detectorType}-${index}`}
        size="small"
        styles={{ body: { padding: token.paddingSM } }}
        title={
          <Space>
            <Tag color={isKnownDetectorType(detectorType) ? 'blue' : 'orange'}>
              {getDetectorLabel(detector)}
            </Tag>
            <Typography.Text>检测器 {index + 1}</Typography.Text>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item label="类型">
            <Select
              disabled={editorDisabled}
              onChange={(nextType) => handleUpdateDetectorType(index, nextType)}
              options={DETECTOR_TYPE_OPTIONS}
              style={fullWidthStyle}
              value={typeValue}
            />
          </Form.Item>
          {renderDescriptionField(detector, index)}
          {renderDetectorFields(detector, index)}
        </Form>
      </Card>
    );
  };

  return (
    <div className={className} data-testid="detector-editor" style={containerStyle}>
      <Space direction="vertical" size="middle" style={fullWidthStyle}>
        <div style={headerStyle}>
          <Space>
            <Typography.Text strong>检测器</Typography.Text>
            <Tag color="blue">{currentDetectors.length}</Tag>
          </Space>
          {!readOnly && (
            <Button
              disabled={disabled}
              icon={<PlusOutlined />}
              onClick={handleAddDetector}
              type="dashed"
            >
              添加检测器
            </Button>
          )}
        </div>

        {currentDetectors.length === 0 ? (
          <Empty description="暂无检测器" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Space direction="vertical" size="middle" style={fullWidthStyle}>
            {currentDetectors.map((detector, index) => renderDetectorCard(detector, index))}
          </Space>
        )}
      </Space>
    </div>
  );
}

export default DetectorEditor;
export type { DetectorConfig, DetectorEditorProps, KnownDetectorType };
