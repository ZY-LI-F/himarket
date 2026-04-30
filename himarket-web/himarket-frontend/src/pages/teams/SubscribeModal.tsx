import { CrownOutlined, ToolOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Modal, Tag } from "antd";
import type { ReactNode } from "react";
import {
  splitTeamMembers,
  type WorkerTeamProduct,
  type WorkerTeamProductMember,
} from "../../services/teamSubscribe";

interface SubscribeModalProps {
  open: boolean;
  team: WorkerTeamProduct;
  confirmLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

interface InstallSectionProps {
  title: string;
  emptyText: string;
  icon: ReactNode;
  items: WorkerTeamProductMember[];
  roleLabel: string;
}

function InstallSection({
  title,
  emptyText,
  icon,
  items,
  roleLabel,
}: InstallSectionProps) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <span className="text-gray-500">{icon}</span>
          <span>{title}</span>
        </div>
        <Tag className="mr-0" color={items.length > 0 ? "blue" : "default"}>
          {items.length}
        </Tag>
      </div>
      {items.length === 0 ? (
        <div className="py-3 text-sm text-gray-400">{emptyText}</div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={`${item.role}-${item.ordinal}-${item.refName}-${item.refVersion}`}
              className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm"
              data-testid={`team-install-item-${item.role}`}
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-gray-900">
                  {item.refName}
                </div>
                <div className="text-xs text-gray-400">
                  {roleLabel} · #{item.ordinal}
                </div>
              </div>
              <Tag className="mr-0 flex-shrink-0">v{item.refVersion}</Tag>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnknownRoleSection({ items }: { items: WorkerTeamProductMember[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="mb-2 text-sm font-medium text-amber-900">其他引用</div>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={`${item.role}-${item.ordinal}-${item.refName}-${item.refVersion}`}
            className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm"
            data-testid="team-install-item-other"
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">
                {item.refName}
              </div>
              <div className="text-xs text-amber-700">
                {item.role} · #{item.ordinal}
              </div>
            </div>
            <Tag className="mr-0 flex-shrink-0">v{item.refVersion}</Tag>
          </div>
        ))}
      </div>
    </div>
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
      open={open}
      title="确认订阅 Worker Team"
      onCancel={onCancel}
      centered
      width={680}
      destroyOnHidden
      getContainer={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} disabled={confirmLoading}>
            取消
          </Button>
          <Button type="primary" loading={confirmLoading} onClick={onConfirm}>
            确认订阅
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="text-base font-semibold text-gray-900">
            {team.name}
          </div>
          <div className="mt-1 text-sm leading-relaxed text-gray-500">
            确认后会发起团队订阅请求，安装清单包含{" "}
            <span className="font-medium text-gray-900">{workerCount}</span> 个
            Worker 与{" "}
            <span className="font-medium text-gray-900">{skills.length}</span>{" "}
            个 Skill。
          </div>
        </div>

        <div className="grid gap-3">
          <InstallSection
            title="Leader Worker"
            emptyText="未配置 Leader"
            icon={<CrownOutlined />}
            items={leaders}
            roleLabel="leader"
          />
          <InstallSection
            title="Member Workers"
            emptyText="未配置成员 Worker"
            icon={<UserOutlined />}
            items={workers}
            roleLabel="member"
          />
          <InstallSection
            title="Skills"
            emptyText="未配置 Skill"
            icon={<ToolOutlined />}
            items={skills}
            roleLabel="skill"
          />
          <UnknownRoleSection items={other} />
        </div>
      </div>
    </Modal>
  );
}
