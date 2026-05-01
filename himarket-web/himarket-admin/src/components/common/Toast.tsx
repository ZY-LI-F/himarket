import { message } from 'antd';
import type { ReactNode } from 'react';

import './atoms.css';

type AntdMessageOpenArgs = Parameters<typeof message.open>[0];
type AntdMessageReturn = ReturnType<typeof message.open>;

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastOptions
  extends Omit<AntdMessageOpenArgs, 'className' | 'content' | 'type'> {
  readonly className?: string;
  readonly content: ReactNode;
}

export type ToastInput = ReactNode | ToastOptions;

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

function isToastOptions(input: ToastInput): input is ToastOptions {
  return typeof input === 'object' && input !== null && 'content' in input;
}

function normalizeToast(input: ToastInput): ToastOptions {
  if (!isToastOptions(input)) {
    return {
      content: input,
      className: 'hm-toast',
    };
  }

  return {
    ...input,
    className: mergeClassNames('hm-toast', input.className),
  };
}

function showToast(type: ToastType, input: ToastInput): AntdMessageReturn {
  return message.open({
    ...normalizeToast(input),
    type,
  });
}

export const toast = {
  destroy: message.destroy,
  error: (input: ToastInput) => showToast('error', input),
  info: (input: ToastInput) => showToast('info', input),
  loading: (input: ToastInput) => showToast('loading', input),
  open: (options: ToastOptions & { readonly type?: ToastType }) =>
    message.open({
      ...options,
      className: mergeClassNames('hm-toast', options.className),
    }),
  success: (input: ToastInput) => showToast('success', input),
  useMessage: message.useMessage,
  warning: (input: ToastInput) => showToast('warning', input),
} as const;
