import { Table as AntdTable } from 'antd';
import type { TableProps as AntdTableProps } from 'antd';

import './Table.css';

export type TableProps<RecordType extends object = object> = AntdTableProps<RecordType>;

function mergeClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export function Table<RecordType extends object = object>({
  className,
  ...props
}: TableProps<RecordType>) {
  return (
    <AntdTable<RecordType>
      {...props}
      className={mergeClassNames('hm-table', className)}
    />
  );
}
