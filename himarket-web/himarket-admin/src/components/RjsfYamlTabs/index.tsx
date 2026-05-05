import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import { Alert, Input, Tabs } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  dumpYamlObject,
  normalizeFormData,
  parseYamlObject,
} from '@/components/RjsfYamlTabs/rjsfYamlSync';
import type { JsonObject } from '@/components/RjsfYamlTabs/rjsfYamlSync';

import type { IChangeEvent } from '@rjsf/core';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { TabsProps } from 'antd';
import type { ChangeEvent } from 'react';

type ActiveTabKey = 'form' | 'yaml';

interface RjsfYamlTabsProps {
  disabled?: boolean;
  onChange?: (value: JsonObject) => void;
  onYamlErrorChange?: (error: string | null) => void;
  readonly?: boolean;
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  value: JsonObject;
}

function isActiveTabKey(value: string): value is ActiveTabKey {
  return value === 'form' || value === 'yaml';
}

export default function RjsfYamlTabs({
  disabled = false,
  onChange,
  onYamlErrorChange,
  readonly = false,
  schema,
  uiSchema,
  value,
}: RjsfYamlTabsProps) {
  const [activeKey, setActiveKey] = useState<ActiveTabKey>('form');
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [yamlText, setYamlText] = useState(() => dumpYamlObject(value));

  const serializedValue = useMemo(() => dumpYamlObject(value), [value]);

  useEffect(() => {
    if (yamlError === null && yamlText !== serializedValue) {
      setYamlText(serializedValue);
    }
  }, [serializedValue, yamlError, yamlText]);

  useEffect(() => {
    onYamlErrorChange?.(yamlError);
  }, [onYamlErrorChange, yamlError]);

  const handleFormChange = useCallback(
    (event: IChangeEvent<JsonObject, RJSFSchema, Record<string, never>>) => {
      const nextValue = normalizeFormData(event.formData);
      setYamlError(null);
      setYamlText(dumpYamlObject(nextValue));
      onChange?.(nextValue);
    },
    [onChange],
  );

  const handleYamlChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const nextText = event.target.value;
      setYamlText(nextText);

      const result = parseYamlObject(nextText);
      setYamlError(result.error);

      if (result.value) {
        onChange?.(result.value);
      }
    },
    [onChange],
  );

  const tabItems: TabsProps['items'] = [
    {
      children: (
        <div className="rounded border border-gray-200 bg-white p-4">
          <Form<JsonObject, RJSFSchema, Record<string, never>>
            disabled={disabled}
            formData={value}
            noHtml5Validate
            onChange={handleFormChange}
            readonly={readonly}
            schema={schema}
            uiSchema={uiSchema}
            validator={validator}
          >
            <></>
          </Form>
        </div>
      ),
      key: 'form',
      label: '表单',
    },
    {
      children: (
        <div className="space-y-3">
          {yamlError && <Alert message={yamlError} showIcon type="error" />}
          <Input.TextArea
            autoSize={{ minRows: 18 }}
            onChange={handleYamlChange}
            readOnly={readonly || disabled}
            value={yamlText}
          />
        </div>
      ),
      key: 'yaml',
      label: 'YAML',
    },
  ];

  return (
    <Tabs
      activeKey={activeKey}
      items={tabItems}
      onChange={(key) => {
        if (!isActiveTabKey(key)) {
          throw new Error(`Unsupported RJSF YAML tab key: ${key}`);
        }
        setActiveKey(key);
      }}
    />
  );
}

export type { JsonObject };
