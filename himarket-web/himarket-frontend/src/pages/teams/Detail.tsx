import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Tag, message } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/common";
import { Layout } from "../../components/Layout";
import { LoginPrompt } from "../../components/LoginPrompt";
import { SkillWorkerDetailSkeleton } from "../../components/loading";
import { useAuth } from "../../hooks/useAuth";
import {
  getWorkerTeam,
  getWorkerTeamSubscriptionStatus,
  isSubscribedStatus,
  splitTeamMembers,
  subscribeWorkerTeam,
  type WorkerTeamProduct,
  type WorkerTeamProductMember,
} from "../../services/teamSubscribe";
import SubscribeModal from "./SubscribeModal";

interface MemberListProps {
  readonly title: string;
  readonly icon: ReactNode;
  readonly items: readonly WorkerTeamProductMember[];
  readonly emptyText: string;
  readonly tone: "leader" | "worker" | "skill" | "other";
}

const toneClassName = {
  leader: "bg-claude-semantic-warning/10 text-claude-semantic-warning",
  worker: "bg-claude-semantic-info/10 text-claude-semantic-info",
  skill: "bg-claude-semantic-success/10 text-claude-semantic-success",
  other: "bg-claude-brand-surfaceTint text-colorPrimary",
} as const;

function MemberList({ title, icon, items, emptyText, tone }: MemberListProps) {
  return (
    <section className="rounded-claude-md border border-claude-neutral-200 bg-white/90 p-4 shadow-claude-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-claude-neutral-900">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-claude-md ${toneClassName[tone]}`}
          >
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </div>
        <Tag className="mr-0">{items.length}</Tag>
      </div>

      {items.length === 0 ? (
        <div className="rounded-claude-md border border-dashed border-claude-neutral-200 bg-claude-neutral-50 px-3 py-4 text-sm text-claude-neutral-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              className="flex items-center justify-between gap-3 rounded-claude-md border border-claude-neutral-200 bg-claude-neutral-50/80 px-3 py-2"
              key={`${item.role}-${item.ordinal}-${item.refName}-${item.refVersion}`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-claude-neutral-900">
                  {item.refName}
                </div>
                <div className="text-xs text-claude-neutral-500">
                  {item.role} · #{item.ordinal}
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

function StatBlock({
  icon,
  label,
  value,
  tone,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: number;
  readonly tone: MemberListProps["tone"];
}) {
  return (
    <div className="rounded-claude-md border border-claude-neutral-200 bg-white/90 p-4 shadow-claude-sm">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-claude-md ${toneClassName[tone]}`}
      >
        {icon}
      </div>
      <div className="text-2xl font-semibold text-claude-neutral-900">
        {value}
      </div>
      <div className="mt-1 text-sm text-claude-neutral-600">{label}</div>
    </div>
  );
}

export default function WorkerTeamDetail() {
  const { teamProductId } = useParams<{ teamProductId: string }>();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [team, setTeam] = useState<WorkerTeamProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const loadSubscriptionStatus = useCallback(async () => {
    if (!teamProductId || !isLoggedIn) {
      setSubscriptionStatus(null);
      return;
    }

    setSubscriptionLoading(true);
    try {
      const status = await getWorkerTeamSubscriptionStatus(teamProductId);
      setSubscriptionStatus(status?.status ?? null);
    } catch (requestError) {
      console.error(
        "Failed to load worker team subscription status:",
        requestError
      );
      setSubscriptionStatus(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [isLoggedIn, teamProductId]);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamProductId) return;
      setLoading(true);
      setError("");
      try {
        const response = await getWorkerTeam(teamProductId);
        if (response.code === "SUCCESS" && response.data) {
          setTeam(response.data);
          return;
        }
        setError(response.message || "Worker Team 不存在");
      } catch (requestError) {
        console.error("Failed to fetch worker team:", requestError);
        setError("Worker Team 加载失败");
      } finally {
        setLoading(false);
      }
    };

    void fetchTeam();
  }, [teamProductId]);

  useEffect(() => {
    void loadSubscriptionStatus();
  }, [loadSubscriptionStatus]);

  const groups = useMemo(
    () => splitTeamMembers(team?.members),
    [team?.members]
  );
  const workerCount = groups.leaders.length + groups.workers.length;
  const subscribed = isSubscribedStatus(subscriptionStatus);
  const updatedAt = team?.updatedAt || team?.createAt;

  const openSubscribeModal = () => {
    if (!isLoggedIn) {
      setLoginPromptOpen(true);
      return;
    }
    setSubscribeOpen(true);
  };

  const confirmSubscribe = async () => {
    if (!team) return;
    setSubscribeLoading(true);
    try {
      const response = await subscribeWorkerTeam(team.productId);
      if (response.code === "SUCCESS" && response.data) {
        setSubscriptionStatus(response.data.status);
        setSubscribeOpen(false);
        message.success("订阅成功");
        return;
      }
      throw new Error(response.message || "订阅 Worker Team 失败");
    } catch (requestError) {
      console.error("Failed to subscribe worker team:", requestError);
      message.error(
        requestError instanceof Error
          ? requestError.message
          : "订阅 Worker Team 失败"
      );
    } finally {
      setSubscribeLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <SkillWorkerDetailSkeleton />
      </Layout>
    );
  }

  if (error || !team) {
    return (
      <Layout>
        <div className="py-8">
          <Alert
            description={error || "Worker Team 不存在"}
            showIcon
            title="加载失败"
            type="error"
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          variant="ghost"
        >
          返回
        </Button>

        <section className="mt-4 border-b border-claude-neutral-200 pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-claude-md bg-colorPrimaryBg text-2xl text-colorPrimary shadow-claude-sm">
                <TeamOutlined />
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold text-claude-neutral-900">
                    {team.name}
                  </h1>
                  {subscribed && (
                    <Tag icon={<CheckCircleOutlined />} color="success">
                      已订阅
                    </Tag>
                  )}
                  {!subscribed && subscriptionStatus && (
                    <Tag color="processing">{subscriptionStatus}</Tag>
                  )}
                </div>
                <p className="max-w-4xl text-sm leading-6 text-claude-neutral-600">
                  {team.description || "暂无团队说明"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Tag>v{team.version}</Tag>
                  {team.businessDomain && <Tag>{team.businessDomain}</Tag>}
                  {team.status && <Tag color="success">{team.status}</Tag>}
                  {(team.tags ?? []).map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                  {updatedAt && (
                    <span className="text-xs text-claude-neutral-500">
                      更新于 {dayjs(updatedAt).format("YYYY-MM-DD HH:mm:ss")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-2 lg:w-[240px]">
              <Button
                disabled={subscribed}
                icon={subscribed ? <CheckCircleOutlined /> : <TeamOutlined />}
                loading={subscriptionLoading}
                onClick={openSubscribeModal}
                size="large"
                variant="primary"
              >
                {subscribed ? "已订阅" : "订阅团队"}
              </Button>
              <div className="rounded-claude-md border border-claude-neutral-200 bg-white/80 px-3 py-2 text-xs leading-5 text-claude-neutral-600">
                安装清单：{workerCount} 个 Worker，{groups.skills.length} 个
                Skill
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <StatBlock
            icon={<CrownOutlined />}
            label="Leader Worker"
            tone="leader"
            value={groups.leaders.length}
          />
          <StatBlock
            icon={<UserOutlined />}
            label="Member Workers"
            tone="worker"
            value={groups.workers.length}
          />
          <StatBlock
            icon={<ToolOutlined />}
            label="Skills"
            tone="skill"
            value={groups.skills.length}
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-claude-md border border-claude-neutral-200 bg-white/90 p-5 shadow-claude-sm">
            <h2 className="text-base font-semibold text-claude-neutral-900">
              团队说明
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-claude-neutral-700">
              {team.description || "暂无团队说明"}
            </p>
          </section>

          <div className="space-y-3">
            <MemberList
              emptyText="未配置 Leader"
              icon={<CrownOutlined />}
              items={groups.leaders}
              title="Leader Worker"
              tone="leader"
            />
            <MemberList
              emptyText="未配置成员 Worker"
              icon={<UserOutlined />}
              items={groups.workers}
              title="Member Workers"
              tone="worker"
            />
            <MemberList
              emptyText="未配置 Skill"
              icon={<ToolOutlined />}
              items={groups.skills}
              title="Skills"
              tone="skill"
            />
            <MemberList
              emptyText="无其他引用"
              icon={<TeamOutlined />}
              items={groups.other}
              title="其他引用"
              tone="other"
            />
          </div>
        </div>
      </div>

      <SubscribeModal
        confirmLoading={subscribeLoading}
        onCancel={() => setSubscribeOpen(false)}
        onConfirm={confirmSubscribe}
        open={subscribeOpen}
        team={team}
      />
      <LoginPrompt
        contextMessage="登录后即可订阅 Worker Team，并把团队中的 Leader、成员 Worker 与 Skills 加入安装清单。"
        onClose={() => setLoginPromptOpen(false)}
        open={loginPromptOpen}
      />
    </Layout>
  );
}
