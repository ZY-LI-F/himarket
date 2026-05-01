import { useState } from "react";
import {
  FolderFilled, FolderOpenFilled, FileFilled,
  FileMarkdownFilled, FileTextFilled, CodeFilled, SettingFilled,
  Html5Filled, FileZipFilled, FileImageFilled,
  JavaScriptOutlined, JavaOutlined, PythonOutlined, DockerOutlined,
  RightOutlined, DownOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import type { SkillFileTreeNode } from "../../lib/apis/cliProvider";

interface SkillFileTreeProps {
  nodes: SkillFileTreeNode[];
  selectedPath?: string;
  onSelect: (path: string) => void;
}

interface TreeNodeProps {
  node: SkillFileTreeNode;
  selectedPath?: string;
  onSelect: (path: string) => void;
  depth: number;
}

// ── File icon by extension (matching admin style) ───────────────
const iconClass = "flex-shrink-0";
const iconStyle = { fontSize: 14 };
const fileIconColors = {
  code: "var(--color-semantic-info)",
  config: "var(--color-brand)",
  data: "var(--color-semantic-warning)",
  doc: "var(--color-neutral-500)",
  image: "var(--color-brand-active)",
  script: "var(--color-semantic-success)",
} as const;

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const lowerName = name.toLowerCase();

  if (lowerName === "dockerfile") return <DockerOutlined className={iconClass} style={{ ...iconStyle, color: fileIconColors.code }} />;
  if (lowerName === ".gitignore") return <FileTextFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.doc }} />;
  if (lowerName === "license" || lowerName === "notice") return <FileTextFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.doc }} />;

  switch (ext) {
    case "md":
      return <FileMarkdownFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.code }} />;
    case "json":
      return <SettingFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.config }} />;
    case "yaml":
    case "yml":
      return <SettingFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.data }} />;
    case "toml":
      return <SettingFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.data }} />;
    case "xml":
      return <CodeFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.config }} />;
    case "html":
      return <Html5Filled className={iconClass} style={{ ...iconStyle, color: fileIconColors.config }} />;
    case "css":
      return <CodeFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.code }} />;
    case "js":
    case "jsx":
      return <JavaScriptOutlined className={iconClass} style={{ ...iconStyle, color: fileIconColors.data }} />;
    case "ts":
    case "tsx":
      return <CodeFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.code }} />;
    case "py":
      return <PythonOutlined className={iconClass} style={{ ...iconStyle, color: fileIconColors.code }} />;
    case "java":
      return <JavaOutlined className={iconClass} style={{ ...iconStyle, color: fileIconColors.config }} />;
    case "sh":
    case "bash":
      return <CodeFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.script }} />;
    case "zip":
    case "tar":
    case "gz":
      return <FileZipFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.data }} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return <FileImageFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.image }} />;
    case "txt":
    case "log":
    case "csv":
      return <FileTextFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.doc }} />;
    default:
      return <FileFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.code }} />;
  }
}

function TreeNode({ node, selectedPath, onSelect, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const isDir = node.type === "directory";
  const isSelected = node.path === selectedPath;

  return (
    <div>
      <Tooltip title={node.name} placement="right" mouseEnterDelay={0.8}>
        <div
          className={`
            flex items-center gap-1 px-1 py-[2px] rounded cursor-pointer text-[13px] select-none
            transition-colors duration-100
            ${isSelected ? "bg-colorPrimaryBgHover text-claude-neutral-900" : "hover:bg-claude-neutral-100 text-claude-neutral-700"}
          `}
          style={{ paddingLeft: `${4 + depth * 16}px` }}
          onClick={() => (isDir ? setExpanded((v) => !v) : onSelect(node.path))}
        >
          {isDir ? (
            <span className="w-4 flex items-center justify-center flex-shrink-0 text-[10px] text-claude-neutral-400">
              {expanded ? <DownOutlined /> : <RightOutlined />}
            </span>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}
          {isDir ? (
            expanded ? (
              <FolderOpenFilled className="text-claude-semantic-warning flex-shrink-0 text-sm" />
            ) : (
              <FolderFilled className="text-claude-semantic-warning flex-shrink-0 text-sm" />
            )
          ) : (
            <FileIcon name={node.name} />
          )}
          <span className="truncate ml-0.5">{node.name}</span>
        </div>
      </Tooltip>
      {isDir && expanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SkillFileTree({ nodes, selectedPath, onSelect }: SkillFileTreeProps) {
  return (
    <div className="overflow-y-auto overflow-x-hidden py-1">
      {nodes.map((node) => (
        <TreeNode key={node.path} node={node} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
      ))}
    </div>
  );
}
