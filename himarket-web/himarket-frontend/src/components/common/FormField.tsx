import { Checkbox, Input, Select } from 'antd';
import type { CheckboxProps, InputProps, SelectProps } from 'antd';
import type { ComponentProps } from 'react';

import './atoms.css';

export type FormInputProps = InputProps;
export type FormPasswordProps = ComponentProps<typeof Input.Password>;
export type FormTextAreaProps = ComponentProps<typeof Input.TextArea>;
export type FormSelectProps<ValueType = unknown> = SelectProps<ValueType>;
export type FormCheckboxProps = CheckboxProps;

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export function FormInput({ className, ...props }: FormInputProps) {
  return (
    <Input
      {...props}
      className={mergeClassNames('hm-form-input', className)}
    />
  );
}

export function FormPassword({ className, ...props }: FormPasswordProps) {
  return (
    <Input.Password
      {...props}
      className={mergeClassNames('hm-form-input', className)}
    />
  );
}

export function FormTextArea({ className, ...props }: FormTextAreaProps) {
  return (
    <Input.TextArea
      {...props}
      className={mergeClassNames('hm-form-input', className)}
    />
  );
}

export function FormSelect<ValueType = unknown>({
  className,
  ...props
}: FormSelectProps<ValueType>) {
  return (
    <Select<ValueType>
      {...props}
      className={mergeClassNames('hm-form-select', className)}
    />
  );
}

export function FormCheckbox({ className, ...props }: FormCheckboxProps) {
  return (
    <Checkbox
      {...props}
      className={mergeClassNames('hm-form-checkbox', className)}
    />
  );
}

export const FormField = {
  Input: FormInput,
  Password: FormPassword,
  TextArea: FormTextArea,
  Select: FormSelect,
  Checkbox: FormCheckbox,
} as const;

