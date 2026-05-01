import {
  CrownOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Input, Pagination, Tag, message } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/common";
import { Layout } from "../../components/Layout";
import { CardGridSkeleton } from "../../components/loading";
import BackToTopButton from "../../components/scroll-to-top";
import { useDebounce } from "../../hooks/useDebounce";
import {
  listWorkerTeams,
  splitTeamMembers,
  type WorkerTeamProduct,
} from "../../services/teamSubscribe";

const PAGE_SIZE = 12;

function Metric({
  icon,
  label,
  value,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-claude-md border border-claude-neutral-200 bg-claude-neutral-50 px-3 py-2">
      <span className="text-colorPrimary">{icon}</span>
      <span className="truncate text-xs text-claude-neutral-600">
        {value} {label}
      </span>
    </div>
  );
}

function TeamCard({
  team,
  onClick,
}: {
  readonly team: WorkerTeamProduct;
  readonly onClick: () => void;
}) {
  const { leaders, workers, skills } = splitTeamMembers(team.members);
  const updatedAt = team.updatedAt || team.createAt;

  return (
    <button
      className="
        group flex min-h-[248px] flex-col rounded-claude-md border border-claude-neutral-200
        bg-white/90 p-5 text-left shadow-claude-sm backdrop-blur-sm
        transition-all duration-claude-base ease-claude
        hover:-translate-y-0.5 hover:border-colorPrimaryBorderHover hover:shadow-claude-md
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-colorPrimary
      "
      onClick={onClick}
      type="button"
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-claude-md bg-colorPrimaryBg text-lg text-colorPrimary">
          <TeamOutlined />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-claude-neutral-900">
              {team.name}
            </h3>
            {team.status && (
              <Tag className="mr-0 shrink-0" color="success">
                {team.status}
              </Tag>
            )}
          </div>
          <div className="mt-1 text-xs text-claude-neutral-500">
            v{team.version}
            {team.businessDomain ? ` · ${team.businessDomain}` : ""}
          </div>
        </div>
      </div>

      <p className="line-clamp-3 flex-1 text-sm leading-6 text-claude-neutral-600">
        {team.description || "暂无团队说明"}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric
          icon={<CrownOutlined />}
          label="leader"
          value={leaders.length}
        />
        <Metric icon={<UserOutlined />} label="worker" value={workers.length} />
        <Metric icon={<ToolOutlined />} label="skill" value={skills.length} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-claude-neutral-200 pt-3 text-xs text-claude-neutral-500">
        <div className="flex min-w-0 items-center gap-1 overflow-hidden">
          {(team.tags ?? []).slice(0, 2).map(tag => (
            <span
              className="truncate rounded-claude-sm bg-claude-brand-surfaceTint px-2 py-1 font-medium text-colorPrimary"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="shrink-0 tabular-nums">
          {updatedAt ? dayjs(updatedAt).format("YYYY-MM-DD") : "未更新"}
        </span>
      </div>
    </button>
  );
}

function EmptyTeams({ searchActive }: { readonly searchActive: boolean }) {
  return (
    <div className="col-span-full rounded-claude-md border border-dashed border-claude-neutral-300 bg-claude-neutral-50/80 px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-claude-md bg-colorPrimaryBg text-xl text-colorPrimary">
        <TeamOutlined />
      </div>
      <h2 className="mt-4 text-base font-semibold text-claude-neutral-900">
        {searchActive ? "没有匹配的 Worker Team" : "暂无 Worker Team"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-claude-neutral-600">
        {searchActive
          ? "调整关键字后再试，当前筛选会匹配团队名称、领域、标签和成员引用。"
          : "这里会展示由 Leader、成员 Worker 与 Skills 组成的可订阅团队包。"}
      </p>
    </div>
  );
}

export default function WorkerTeamBrowse() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [teams, setTeams] = useState<readonly WorkerTeamProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useDebounce(searchQuery, 300, value => {
    setCommittedSearch(value.trim());
  });

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await listWorkerTeams({
          page: currentPage - 1,
          size: PAGE_SIZE,
        });
        if (response.code === "SUCCESS" && response.data) {
          setTeams(response.data.content ?? []);
          setTotalElements(response.data.totalElements ?? 0);
          return;
        }
        setError(response.message || "获取 Worker Teams 失败");
      } catch (requestError) {
        console.error("Failed to fetch worker teams:", requestError);
        setError("获取 Worker Teams 失败");
        message.error("获取 Worker Teams 失败");
      } finally {
        setLoading(false);
      }
    };

    void fetchTeams();
  }, [currentPage, reloadToken]);

  const filteredTeams = useMemo(() => {
    if (!committedSearch) return teams;
    const keyword = committedSearch.toLowerCase();
    return teams.filter(team => {
      const searchable = [
        team.name,
        team.description,
        team.businessDomain,
        ...(team.tags ?? []),
        ...(team.members ?? []).map(member => member.refName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(keyword);
    });
  }, [committedSearch, teams]);

  const totalMembers = useMemo(
    () => teams.reduce((count, team) => count + (team.members?.length ?? 0), 0),
    [teams]
  );

  const commitSearch = () => {
    setCommittedSearch(searchQuery.trim());
  };

  return (
    <Layout>
      <div
        className="flex h-[calc(100vh-96px)] flex-col overflow-auto py-6 scrollbar-hide"
        ref={scrollContainerRef}
      >
        <div className="flex flex-col gap-4 border-b border-claude-neutral-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-colorPrimary">
              Worker Teams
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-claude-neutral-900">
              团队订阅市场
            </h1>
            <p className="mt-2 text-sm leading-6 text-claude-neutral-600">
              以团队为单位订阅 Leader、成员 Worker 与
              Skills，快速获得完整的自动化协作能力。
            </p>
          </div>

          <div className="grid min-w-[min(100%,28rem)] grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-claude-md border border-claude-neutral-200 bg-white/80 px-4 py-3 shadow-claude-sm">
              <div className="text-2xl font-semibold text-claude-neutral-900">
                {totalElements}
              </div>
              <div className="text-xs text-claude-neutral-500">总团队数</div>
            </div>
            <div className="rounded-claude-md border border-claude-neutral-200 bg-white/80 px-4 py-3 shadow-claude-sm">
              <div className="text-2xl font-semibold text-claude-neutral-900">
                {teams.length}
              </div>
              <div className="text-xs text-claude-neutral-500">当前页</div>
            </div>
            <div className="rounded-claude-md border border-claude-neutral-200 bg-white/80 px-4 py-3 shadow-claude-sm">
              <div className="text-2xl font-semibold text-claude-neutral-900">
                {totalMembers}
              </div>
              <div className="text-xs text-claude-neutral-500">成员引用</div>
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-claude-neutral-200 bg-claude-neutral-50/90 py-4 backdrop-blur-md md:flex-row md:items-center md:justify-between">
          <div className="w-full max-w-xl">
            <Input
              className="rounded-claude-md"
              onChange={event => setSearchQuery(event.target.value)}
              onPressEnter={commitSearch}
              placeholder="筛选当前页团队、领域、标签或成员"
              size="large"
              suffix={
                <Button
                  aria-label="筛选团队"
                  icon={<SearchOutlined />}
                  onClick={commitSearch}
                  size="small"
                  variant="primary"
                />
              }
              value={searchQuery}
            />
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setCurrentPage(1);
              setReloadToken(current => current + 1);
            }}
          >
            刷新
          </Button>
        </div>

        <div className="flex-1 pt-5">
          {error ? (
            <Alert
              className="mx-auto max-w-3xl"
              description={error}
              showIcon
              title="加载失败"
              type="error"
            />
          ) : loading ? (
            <CardGridSkeleton count={8} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredTeams.map(team => (
                  <TeamCard
                    key={team.productId}
                    onClick={() => navigate(`/teams/${team.productId}`)}
                    team={team}
                  />
                ))}
                {filteredTeams.length === 0 && (
                  <EmptyTeams searchActive={Boolean(committedSearch)} />
                )}
              </div>

              {totalElements > PAGE_SIZE && !committedSearch && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    current={currentPage}
                    onChange={setCurrentPage}
                    pageSize={PAGE_SIZE}
                    showSizeChanger={false}
                    total={totalElements}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <BackToTopButton container={scrollContainerRef.current ?? undefined} />
    </Layout>
  );
}
