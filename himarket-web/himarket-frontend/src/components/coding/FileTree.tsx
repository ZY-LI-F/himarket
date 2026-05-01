import { useState, useCallback } from "react";
import {
  FolderFilled, FolderOpenFilled, FileFilled,
  FileMarkdownFilled, FileTextFilled, CodeFilled, SettingFilled,
  Html5Filled, FileZipFilled, FileImageFilled,
  JavaScriptOutlined, JavaOutlined, PythonOutlined, DockerOutlined,
  RightOutlined, DownOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import type { FileNode } from "../../types/coding";

interface FileTreeProps {
  tree: FileNode[];
  onFileSelect: (node: FileNode) => void;
  selectedPath?: string | null;
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  onFileSelect: (node: FileNode) => void;
  selectedPath?: string | null;
}

// ── File icon by extension (matching admin IDEA style) ───────────────
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
    case "scss":
    case "less":
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
    case "go":
    case "rs":
    case "rb":
    case "php":
    case "c":
    case "cpp":
    case "h":
    case "hpp":
    case "cs":
    case "swift":
    case "kt":
    case "vue":
    case "svelte":
    case "sql":
      return <CodeFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.code }} />;
    case "zip":
    case "tar":
    case "gz":
      return <FileZipFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.data }} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
    case "ico":
      return <FileImageFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.image }} />;
    case "txt":
    case "log":
    case "csv":
    case "ini":
    case "cfg":
    case "conf":
      return <FileTextFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.doc }} />;
    default:
      return <FileFilled className={iconClass} style={{ ...iconStyle, color: fileIconColors.code }} />;
  }
}

function TreeNode({ node, depth, onFileSelect, selectedPath }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDir = node.type === "directory";
  const isSelected = node.path === selectedPath;

  const handleClick = useCallback(() => {
    if (isDir) {
      setExpanded(prev => !prev);
    } else {
      onFileSelect(node);
    }
  }, [isDir, node, onFileSelect]);

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
          onClick={handleClick}
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
      {isDir && expanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
            />
          ))}
          {node.truncated && (
            <div
              className="text-[11px] text-claude-semantic-warning px-2 py-1"
              style={{ paddingLeft: `${(depth + 1) * 16 + 4}px` }}
            >
              ⚠ 文件过多，仅显示部分
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FileTree({ tree, onFileSelect, selectedPath }: FileTreeProps) {
  if (tree.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-claude-neutral-400 px-3">
        暂无文件
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full py-1 select-none">
      {tree.map(node => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          onFileSelect={onFileSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}
