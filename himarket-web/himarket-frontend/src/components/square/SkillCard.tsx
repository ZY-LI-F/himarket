import { DownloadOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { Card } from "../common";

interface SkillCardProps {
  actions?: ReactNode;
  name: string;
  description: string;
  releaseDate: string;
  skillTags?: string[];
  downloadCount?: number;
  onClick?: () => void;
}

export function SkillCard({
  actions,
  name,
  description,
  releaseDate,
  skillTags = [],
  downloadCount,
  onClick,
}: SkillCardProps) {
  return (
    <Card
      variant="interactive"
      onClick={onClick}
      className="
        group h-full bg-white/85 backdrop-blur-sm
        border-claude-neutral-200
        cursor-pointer
        transition-all duration-300 ease-out
        hover:bg-white hover:shadow-claude-md hover:-translate-y-0.5 hover:border-colorPrimary/40
        active:scale-[0.98] active:duration-150
      "
    >
      <div className="flex h-[152px] flex-col">
      {/* 名称 + 下载数 */}
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-base font-semibold text-gray-800 truncate flex-1 group-hover:text-gray-900 transition-colors">
          {name}
        </h3>
        <span className="flex items-center gap-1.5 text-gray-400 text-sm flex-shrink-0">
          <DownloadOutlined className="text-sm text-gray-400" />
          {downloadCount ?? 0}
        </span>
      </div>

      {/* 简介 */}
      <p className="text-sm line-clamp-3 leading-relaxed text-gray-500 flex-1">
        {description}
      </p>

      {/* 底部：标签 + 下载数 + 日期 */}
      <div className="mt-2 space-y-1.5">
        {(skillTags ?? []).length > 0 && (
          <div className="flex items-center gap-1 overflow-hidden">
            {(skillTags ?? []).slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-500 whitespace-nowrap border border-gray-100"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div
          className={`flex items-center gap-2 text-gray-400 text-xs ${actions ? "justify-between" : "justify-end"}`}
        >
          <span className="tabular-nums tracking-tight">{releaseDate}</span>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      </div>
      </div>
    </Card>
  );
}
