import { Button } from "antd";
import { useId, useState } from "react";

interface FailureExpandProps {
  defaultOpen?: boolean;
  failureExcerpt: string;
}

export function FailureExpand({
  defaultOpen = true,
  failureExcerpt,
}: FailureExpandProps) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-md border border-red-200 bg-red-50 p-3"
      data-testid="failure-expand"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white"
          data-testid="failure-badge"
        >
          Failed
        </span>
        <Button
          aria-controls={panelId}
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
          size="small"
          type="link"
          className="h-auto p-0 text-red-700"
        >
          Show failure
        </Button>
      </div>
      {open && (
        <pre
          aria-label="Failure details"
          className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-red-100 bg-white p-3 text-xs leading-5 text-red-900"
          data-testid="failure-expand-panel"
          id={panelId}
          role="region"
        >
          {failureExcerpt}
        </pre>
      )}
    </div>
  );
}
