import { CrownOutlined, ToolOutlined, UserOutlined } from "@ant-design/icons";
import { Tag } from "antd";
import type { ReactNode } from "react";
import { Button, Modal } from "../../components/common";
import {
  splitTeamMembers,
  type WorkerTeamProduct,
  type WorkerTeamProductMember,
} from "../../services/teamSubscribe";

interface SubscribeModalProps {
  readonly open: boolean;
  readonly team: WorkerTeamProduct;
  readonly confirmLoading?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

interface InstallSectionProps {
  readonly title: string;
  readonly emptyText: string;
  readonly icon: ReactNode;
  readonly items: readonly WorkerTeamProductMember[];
  readonly roleLabel: string;
  readonly tone: "leader" | "worker" | "skill";
}

const sectionToneClassName = {
  leader: "bg-claude-semantic-warning/10 text-claude-semantic-warning",
  worker: "bg-claude-semantic-info/10 text-claude-semantic-info",
  skill: "bg-claude-semantic-success/10 text-claude-semantic-success",
} as const;

function InstallSection({
  title,
  emptyText,
  icon,
  items,
  roleLabel,
  tone,
}: InstallSectionProps) {
  return (
    <section className="rounded-claude-md border border-claude-neutral-200 bg-claude-neutral-50/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-claude-neutral-900">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-claude-md ${sectionToneClassName[tone]}`}
          >
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </div>
        <Tag
          className="mr-0"
          color={items.length > 0 ? "processing" : "default"}
        >
          {items.length}
        </Tag>
      </div>

      {items.length === 0 ? (
        <div className="rounded-claude-md border border-dashed border-claude-neutral-200 px-3 py-4 text-sm text-claude-neutral-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={`${item.role}-${item.ordinal}-${item.refName}-${item.refVersion}`}
              className="flex items-center justify-between gap-3 rounded-claude-md border border-claude-neutral-200 bg-white px-3 py-2 text-sm shadow-claude-sm"
              data-testid={`team-install-item-${item.role}`}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-claude-neutral-900">
                  {item.refName}
                </div>
                <div className="text-xs text-claude-neutral-500">
                  {roleLabel} · #{item.ordinal}
                </div>
              </div>
              <Tag className="mr-0 shrink-0">v{item.refVersion}</Tag>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UnknownRoleSection({
  items,
}: {
  readonly items: readonly WorkerTeamProductMember[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-claude-md border border-claude-neutral-200 bg-claude-brand-surfaceTint/60 p-4">
      <div className="mb-3 text-sm font-semibold text-claude-neutral-900">
        其他引用
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={`${item.role}-${item.ordinal}-${item.refName}-${item.refVersion}`}
            className="flex items-center justify-between gap-3 rounded-claude-md border border-claude-neutral-200 bg-white px-3 py-2 text-sm"
            data-testid="team-install-item-other"
          >
            <div className="min-w-0">
              <div className="truncate font-semibold text-claude-neutral-900">
                {item.refName}
              </div>
              <div className="text-xs text-claude-neutral-600">
                {item.role} · #{item.ordinal}
              </div>
            </div>
            <Tag className="mr-0 shrink-0">v{item.refVersion}</Tag>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SubscribeModal({
  open,
  team,
  confirmLoading = false,
  onCancel,
  onConfirm,
}: SubscribeModalProps) {
  const { leaders, workers, skills, other } = splitTeamMembers(team.members);
  const workerCount = leaders.length + workers.length;

  return (
    <Modal
      centered
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button disabled={confirmLoading} onClick={onCancel}>
            取消
          </Button>
          <Button
            loading={confirmLoading}
            onClick={onConfirm}
            variant="primary"
          >
            确认订阅
          </Button>
        </div>
      }
      getContainer={false}
      onCancel={onCancel}
      open={open}
      title="确认订阅 Worker Team"
      width={720}
    >
      <div className="space-y-5">
        <div className="rounded-claude-md border border-claude-neutral-200 bg-claude-neutral-50/80 p-4">
          <div className="text-lg font-semibold text-claude-neutral-900">
            {team.name}
          </div>
          <div className="mt-2 text-sm leading-6 text-claude-neutral-600">
            确认后会发起团队订阅请求，安装清单包含{" "}
            <span className="font-semibold text-claude-neutral-900">
              {workerCount}
            </span>{" "}
            个 Worker 与{" "}
            <span className="font-semibold text-claude-neutral-900">
              {skills.length}
            </span>{" "}
            个 Skill。
          </div>
        </div>

        <div className="grid gap-3">
          <InstallSection
            emptyText="未配置 Leader"
            icon={<CrownOutlined />}
            items={leaders}
            roleLabel="leader"
            title="Leader Worker"
            tone="leader"
          />
          <InstallSection
            emptyText="未配置成员 Worker"
            icon={<UserOutlined />}
            items={workers}
            roleLabel="member"
            title="Member Workers"
            tone="worker"
          />
          <InstallSection
            emptyText="未配置 Skill"
            icon={<ToolOutlined />}
            items={skills}
            roleLabel="skill"
            title="Skills"
            tone="skill"
          />
          <UnknownRoleSection items={other} />
        </div>
      </div>
    </Modal>
  );
}
