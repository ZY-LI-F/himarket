import { Empty as AntdEmpty } from 'antd';
import type { EmptyProps as AntdEmptyProps } from 'antd';
import type { ReactNode } from 'react';

import './atoms.css';

export interface EmptyProps extends AntdEmptyProps {
  readonly action?: ReactNode;
  readonly compact?: boolean;
}

export const emptyImages = {
  simple: AntdEmpty.PRESENTED_IMAGE_SIMPLE,
} as const;

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export function Empty({
  action,
  className,
  compact = false,
  ...props
}: EmptyProps) {
  return (
    <div
      className={mergeClassNames('hm-empty', compact ? 'hm-empty--compact' : undefined, className)}
    >
      <AntdEmpty {...props} />
      {action && <div className="hm-empty__action">{action}</div>}
    </div>
  );
}

