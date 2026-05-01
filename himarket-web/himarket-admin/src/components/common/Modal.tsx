import { Modal as AntdModal } from 'antd';
import type { ModalProps as AntdModalProps } from 'antd';

import './atoms.css';

export type ModalTone = 'default' | 'danger';

export interface ModalProps extends AntdModalProps {
  readonly tone?: ModalTone;
}

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

function ModalBase({
  className,
  tone = 'default',
  ...props
}: ModalProps) {
  return (
    <AntdModal
      {...props}
      className={mergeClassNames('hm-modal', `hm-modal--${tone}`, className)}
    />
  );
}

export const Modal = Object.assign(ModalBase, {
  confirm: AntdModal.confirm,
  destroyAll: AntdModal.destroyAll,
  useModal: AntdModal.useModal,
});
