import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Tag, message } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  title: string;
  icon: ReactNode;
  items: WorkerTeamProductMember[];
  emptyText: string;
  tone: "leader" | "worker" | "skill" | "other";
}

const toneClassName = {
  leader: "text-amber-500 bg-amber-50",
  worker: "text-blue-500 bg-blue-50",
  skill: "text-emerald-500 bg-emerald-50",
  other: "text-amber-700 bg-amber-50",
};

function MemberList({ title, icon, items, emptyText, tone }: MemberListProps) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClassName[tone]}`}
          >
            {icon}
          </span>
          {title}
        </div>
        <Tag className="mr-0">{items.length}</Tag>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg bg-gray-50 px-3 py-4 text-sm text-gray-400">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={`${item.role}-${item.ordinal}-${item.refName}-${item.refVersion}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-900">
                  {item.refName}
                </div>
                <div className="text-xs text-gray-400">
                  {item.role} · #{item.ordinal}
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
    } catch (err) {
      console.error("Failed to load worker team subscription status:", err);
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
        } else {
          setError(response.message || "Worker Team 不存在");
        }
      } catch (err) {
        console.error("Failed to fetch worker team:", err);
        setError("Worker Team 加载失败");
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [teamProductId]);

  useEffect(() => {
    loadSubscriptionStatus();
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
    } catch (err) {
      console.error("Failed to subscribe worker team:", err);
      message.error(
        err instanceof Error ? err.message : "订阅 Worker Team 失败"
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
        <div className="p-8">
          <Alert
            message="加载失败"
            description={error || "Worker Team 不存在"}
            type="error"
            showIcon
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 rounded-xl px-4 py-2 text-gray-600 transition-all duration-200 hover:bg-colorPrimaryBgHover hover:text-colorPrimary"
        >
          <ArrowLeftOutlined />
          <span>返回</span>
        </button>

        <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/75 p-5 backdrop-blur-sm md:flex-row md:items-start">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-3xl text-blue-600">
            <TeamOutlined />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">
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
            <p className="max-w-5xl text-sm leading-relaxed text-gray-500">
              {team.description || "暂无团队说明"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Tag>v{team.version}</Tag>
              {team.businessDomain && <Tag>{team.businessDomain}</Tag>}
              {team.status && <Tag color="green">{team.status}</Tag>}
              {(team.tags ?? []).map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
              {updatedAt && (
                <span className="text-xs text-gray-400">
                  更新于 {dayjs(updatedAt).format("YYYY-MM-DD HH:mm:ss")}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-col items-stretch gap-2 md:w-[220px]">
            <Button
              type="primary"
              size="large"
              disabled={subscribed}
              loading={subscriptionLoading}
              onClick={openSubscribeModal}
              icon={subscribed ? <CheckCircleOutlined /> : <TeamOutlined />}
            >
              {subscribed ? "已订阅" : "订阅团队"}
            </Button>
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
              安装清单：{workerCount} 个 Worker，{groups.skills.length} 个 Skill
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-100 bg-white p-5">
              <h2 className="mb-3 text-base font-semibold text-gray-900">
                团队说明
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-600">
                {team.description || "暂无团队说明"}
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-5">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                订阅将安装
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-amber-50 p-4">
                  <CrownOutlined className="mb-2 text-lg text-amber-500" />
                  <div className="text-2xl font-semibold text-gray-900">
                    {groups.leaders.length}
                  </div>
                  <div className="text-sm text-gray-500">Leader</div>
                </div>
                <div className="rounded-xl bg-blue-50 p-4">
                  <UserOutlined className="mb-2 text-lg text-blue-500" />
                  <div className="text-2xl font-semibold text-gray-900">
                    {groups.workers.length}
                  </div>
                  <div className="text-sm text-gray-500">Member Workers</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <ToolOutlined className="mb-2 text-lg text-emerald-500" />
                  <div className="text-2xl font-semibold text-gray-900">
                    {groups.skills.length}
                  </div>
                  <div className="text-sm text-gray-500">Skills</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <MemberList
              title="Leader Worker"
              icon={<CrownOutlined />}
              items={groups.leaders}
              emptyText="未配置 Leader"
              tone="leader"
            />
            <MemberList
              title="Member Workers"
              icon={<UserOutlined />}
              items={groups.workers}
              emptyText="未配置成员 Worker"
              tone="worker"
            />
            <MemberList
              title="Skills"
              icon={<ToolOutlined />}
              items={groups.skills}
              emptyText="未配置 Skill"
              tone="skill"
            />
            <MemberList
              title="其他引用"
              icon={<TeamOutlined />}
              items={groups.other}
              emptyText="无其他引用"
              tone="other"
            />
          </div>
        </div>
      </div>

      <SubscribeModal
        open={subscribeOpen}
        team={team}
        confirmLoading={subscribeLoading}
        onCancel={() => setSubscribeOpen(false)}
        onConfirm={confirmSubscribe}
      />
      <LoginPrompt
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        contextMessage="登录后即可订阅 Worker Team，并把团队中的 Leader、成员 Worker 与 Skills 加入安装清单。"
      />
    </Layout>
  );
}
