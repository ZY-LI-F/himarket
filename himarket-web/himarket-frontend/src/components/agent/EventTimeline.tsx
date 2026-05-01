import { Tag } from "antd";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { Button, Empty, emptyImages } from "../common";
import { FailureExpand } from "./FailureExpand";
import type { TaskEvent } from "../../lib/apis/agent";

type TaskEventKind = TaskEvent["kind"];

const EVENT_META: Record<
  Exclude<TaskEventKind, "log">,
  { dotClass: string; label: string }
> = {
  plan: { dotClass: "bg-blue-500", label: "Plan" },
  "worker.assigned": { dotClass: "bg-gray-400", label: "Worker assigned" },
  "tool.call": { dotClass: "bg-orange-500", label: "Tool call" },
  "file.diff": { dotClass: "bg-purple-500", label: "File diff" },
  "task.completed": { dotClass: "bg-green-500", label: "Task completed" },
  "task.failed": { dotClass: "bg-red-500", label: "Task failed" },
};

const FAILURE_KEYS = [
  "failureExcerpt",
  "stderr",
  "error",
  "message",
  "detail",
  "excerpt",
];

interface EventTimelineProps {
  events: TaskEvent[];
}

function payloadValue(payload: TaskEvent["payload"], keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value, null, 2);
}

function payloadString(event: TaskEvent, keys: string[], fallback = "") {
  const value = payloadValue(event.payload, keys);
  const text = stringify(value);
  return text || fallback;
}

function logMessage(event: TaskEvent) {
  return payloadString(
    event,
    ["message", "token", "delta", "content"],
    "Log event"
  );
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function PayloadBlock({ payload }: { payload: TaskEvent["payload"] }) {
  return (
    <pre className="mt-2 overflow-auto rounded border border-gray-100 bg-gray-50 p-2 text-xs leading-5 text-gray-700">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

function PlanBody({ event }: { event: TaskEvent }) {
  const steps = event.payload.steps;
  const summary = payloadString(event, ["summary", "title", "message"]);
  if (Array.isArray(steps)) {
    return (
      <div className="mt-2 space-y-2">
        {summary && <p className="text-sm text-gray-700">{summary}</p>}
        <ol className="list-decimal pl-5 text-sm leading-6 text-gray-700">
          {steps.map((step, index) => (
            <li key={`${event.seq}-step-${index}`}>{stringify(step)}</li>
          ))}
        </ol>
      </div>
    );
  }
  return <PayloadBlock payload={event.payload} />;
}

function WorkerBody({ event }: { event: TaskEvent }) {
  const worker = payloadString(event, ["workerId", "worker", "name"], "worker");
  const role = payloadString(event, ["role"]);
  return (
    <p className="mt-1 text-sm text-gray-600">
      {worker}
      {role ? <span className="text-gray-400"> / {role}</span> : null}
    </p>
  );
}

function ToolBody({ event }: { event: TaskEvent }) {
  const tool = payloadString(event, ["toolName", "name", "tool"], "tool");
  const input = payloadValue(event.payload, [
    "input",
    "arguments",
    "args",
    "params",
  ]);
  return (
    <div className="mt-1 space-y-2 text-sm text-gray-700">
      <div>{tool}</div>
      {input !== undefined && (
        <pre className="overflow-auto rounded border border-orange-100 bg-orange-50 p-2 text-xs leading-5 text-gray-800">
          {stringify(input)}
        </pre>
      )}
    </div>
  );
}

function DiffMarkdown({ diff }: { diff: string }) {
  return (
    <div className="markdown-body mt-2 rounded border border-purple-100 bg-white p-3 text-xs">
      <ReactMarkdown>{`\`\`\`diff\n${diff}\n\`\`\``}</ReactMarkdown>
    </div>
  );
}

function ExpandableDiff({ diff }: { diff: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <Button
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        size="small"
      >
        {open ? "Hide diff" : "Show diff"}
      </Button>
      {open && (
        <div aria-label="Diff view" role="region">
          <DiffMarkdown diff={diff} />
        </div>
      )}
    </div>
  );
}

function FileDiffBody({ event }: { event: TaskEvent }) {
  const path = payloadString(
    event,
    ["path", "file", "filePath"],
    "Changed file"
  );
  const diff = payloadString(
    event,
    ["diff", "patch", "content"],
    "No diff content"
  );
  return (
    <div className="mt-1 text-sm text-gray-700">
      <div className="font-mono text-xs text-gray-600">{path}</div>
      <ExpandableDiff diff={diff} />
    </div>
  );
}

function artifactLinks(value: unknown) {
  if (!Array.isArray(value)) return null;
  const artifacts = value.filter(isRecord);
  if (artifacts.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {artifacts.map((artifact, index) => {
        const path = stringify(
          artifact.path || artifact.id || `artifact-${index + 1}`
        );
        const url = stringify(artifact.downloadUrl);
        return (
          <li key={`${path}-${index}`}>
            {url ? (
              <a className="text-blue-600" href={url}>
                {path}
              </a>
            ) : (
              <span>{path}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CompletedBody({ event }: { event: TaskEvent }) {
  const result = payloadString(event, ["result", "message", "summary"]);
  return (
    <div className="mt-1 text-sm text-gray-700">
      {result || "Task finished successfully"}
      {artifactLinks(event.payload.artifacts)}
    </div>
  );
}

function FailedBody({ event }: { event: TaskEvent }) {
  const failureExcerpt = payloadString(event, FAILURE_KEYS, "Task failed");
  return (
    <div className="mt-2">
      <FailureExpand defaultOpen failureExcerpt={failureExcerpt} />
    </div>
  );
}

function EventBody({ event }: { event: TaskEvent }) {
  if (event.kind === "plan") return <PlanBody event={event} />;
  if (event.kind === "worker.assigned") return <WorkerBody event={event} />;
  if (event.kind === "tool.call") return <ToolBody event={event} />;
  if (event.kind === "file.diff") return <FileDiffBody event={event} />;
  if (event.kind === "task.completed") return <CompletedBody event={event} />;
  if (event.kind === "task.failed") return <FailedBody event={event} />;
  return <PayloadBlock payload={event.payload} />;
}

function LogItem({ event }: { event: TaskEvent }) {
  return (
    <li
      className="ml-5 pb-3 text-xs leading-5 text-gray-500"
      data-testid="event-log"
    >
      <time className="mr-2 text-gray-400" dateTime={event.timestamp}>
        {formatTimestamp(event.timestamp)}
      </time>
      {logMessage(event)}
    </li>
  );
}

function EventItem({ event }: { event: TaskEvent }) {
  if (event.kind === "log") return <LogItem event={event} />;

  const meta = EVENT_META[event.kind];
  const indentedClass = event.kind === "worker.assigned" ? "ml-10" : "ml-5";
  return (
    <li
      className={`relative pb-5 ${indentedClass}`}
      data-testid={`event-${event.kind}`}
    >
      <span
        aria-label={`${meta.label} dot`}
        className={`absolute -left-[21px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${meta.dotClass}`}
        data-testid={`timeline-dot-${event.kind}`}
      />
      <article className="rounded-md border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 text-sm font-semibold text-gray-900">
            {meta.label}
          </h3>
          {event.agentId && <Tag className="m-0">{event.agentId}</Tag>}
          <time className="text-xs text-gray-400" dateTime={event.timestamp}>
            {formatTimestamp(event.timestamp)}
          </time>
        </div>
        <EventBody event={event} />
      </article>
    </li>
  );
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div
        className="flex min-h-48 items-center justify-center"
        data-testid="event-timeline"
      >
        <Empty
          description="No task events yet"
          image={emptyImages.simple}
          compact
        />
      </div>
    );
  }

  return (
    <ol
      aria-label="Task event timeline"
      className="relative border-l border-gray-200 pl-0"
      data-testid="event-timeline"
    >
      {events.map(event => (
        <EventItem event={event} key={`${event.seq}-${event.kind}`} />
      ))}
    </ol>
  );
}
