import { Card as AntdCard } from 'antd';
import type { CardProps as AntdCardProps } from 'antd';

import './atoms.css';

export type CardVariant = 'default' | 'muted' | 'interactive';

export interface CardProps extends Omit<AntdCardProps, 'variant'> {
  readonly variant?: CardVariant;
}

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export function Card({
  variant = 'default',
  className,
  ...props
}: CardProps) {
  return (
    <AntdCard
      {...props}
      className={mergeClassNames('hm-card', `hm-card--${variant}`, className)}
    />
  );
}
