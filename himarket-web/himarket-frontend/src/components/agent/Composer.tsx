import { Button, Input, Tag } from "antd";
import type { KeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { FileText, Send, X } from "lucide-react";

const FILE_TRIGGER_PATTERN = /@file:([^\s]*)$/;
const FILE_REF_PATTERN = /@file:([^\s]+)/g;
const MAX_SUGGESTIONS = 8;

export interface AgentFileReference {
  label?: string;
  path: string;
}

export interface ComposerSubmitPayload {
  fileRefs: string[];
  text: string;
}

interface ComposerProps {
  disabled?: boolean;
  fileReferences: AgentFileReference[];
  onSubmit: (payload: ComposerSubmitPayload) => void | Promise<void>;
}

function findFileQuery(text: string) {
  const match = text.match(FILE_TRIGGER_PATTERN);
  return match ? match[1] : null;
}

function removeFileTrigger(text: string) {
  return text.replace(FILE_TRIGGER_PATTERN, "").replace(/\s+$/, "");
}

function extractInlineFileRefs(text: string) {
  return Array.from(text.matchAll(FILE_REF_PATTERN), (match) => match[1]);
}

function uniqueRefs(refs: string[]) {
  return Array.from(new Set(refs.filter(Boolean)));
}

function filterFileReferences(
  refs: AgentFileReference[],
  query: string | null,
) {
  if (query === null) return [];
  const normalized = query.toLowerCase();
  return refs
    .filter((ref) => ref.path.toLowerCase().includes(normalized))
    .slice(0, MAX_SUGGESTIONS);
}

function FileChips({
  fileRefs,
  onRemove,
}: {
  fileRefs: string[];
  onRemove: (path: string) => void;
}) {
  if (fileRefs.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {fileRefs.map((path) => (
        <Tag
          className="m-0 flex max-w-[260px] items-center gap-1 truncate px-2 py-0.5"
          key={path}
        >
          <FileText aria-hidden="true" size={12} />
          <span className="truncate">@file:{path}</span>
          <button
            aria-label={`移除 ${path}`}
            className="inline-flex text-gray-400 hover:text-gray-700"
            onClick={() => onRemove(path)}
            type="button"
          >
            <X aria-hidden="true" size={12} />
          </button>
        </Tag>
      ))}
    </div>
  );
}

function SuggestionMenu({
  onSelect,
  refs,
}: {
  onSelect: (ref: AgentFileReference) => void;
  refs: AgentFileReference[];
}) {
  if (refs.length === 0) return null;
  return (
    <div className="absolute bottom-full left-0 mb-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
      {refs.map((ref) => (
        <button
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
          key={ref.path}
          onClick={() => onSelect(ref)}
          type="button"
        >
          <FileText aria-hidden="true" className="text-blue-500" size={14} />
          <span className="min-w-0 flex-1 truncate">{ref.label ?? ref.path}</span>
        </button>
      ))}
    </div>
  );
}

export function Composer({ disabled, fileReferences, onSubmit }: ComposerProps) {
  const [text, setText] = useState("");
  const [fileRefs, setFileRefs] = useState<string[]>([]);
  const fileQuery = findFileQuery(text);
  const suggestions = useMemo(
    () => filterFileReferences(fileReferences, fileQuery),
    [fileReferences, fileQuery],
  );

  const canSubmit = !disabled && text.trim().length > 0;

  const selectFile = (ref: AgentFileReference) => {
    setText(removeFileTrigger(text));
    setFileRefs((current) =>
      current.includes(ref.path) ? current : [...current, ref.path],
    );
  };

  const submit = () => {
    if (!canSubmit) return;
    const inlineRefs = extractInlineFileRefs(text);
    void onSubmit({ text: text.trim(), fileRefs: uniqueRefs([...fileRefs, ...inlineRefs]) });
    setText("");
    setFileRefs([]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (suggestions[0]) {
      selectFile(suggestions[0]);
      return;
    }
    submit();
  };

  return (
    <div className="relative border-t border-gray-100 bg-white px-4 py-3">
      <SuggestionMenu refs={suggestions} onSelect={selectFile} />
      <FileChips
        fileRefs={fileRefs}
        onRemove={(path) =>
          setFileRefs((current) => current.filter((item) => item !== path))
        }
      />
      <div className="flex items-end gap-2">
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，使用 @file:path 引用文件"
          value={text}
        />
        <Button
          aria-label="发送消息"
          disabled={!canSubmit}
          icon={<Send aria-hidden="true" size={16} />}
          onClick={submit}
          type="primary"
        />
      </div>
    </div>
  );
}
