import { Button as AntdButton } from 'antd';
import type { ButtonProps as AntdButtonProps } from 'antd';

import './atoms.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends Omit<AntdButtonProps, 'type' | 'variant'> {
  readonly variant?: ButtonVariant;
}

const variantType: Record<ButtonVariant, AntdButtonProps['type']> = {
  primary: 'primary',
  secondary: 'default',
  ghost: 'text',
};

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export function Button({
  variant = 'secondary',
  className,
  ...props
}: ButtonProps) {
  return (
    <AntdButton
      {...props}
      className={mergeClassNames('hm-button', `hm-button--${variant}`, className)}
      type={variantType[variant]}
    />
  );
}
