import {
  CrownOutlined,
  SearchOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Input, Pagination, Tag, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
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

function TeamCard({
  team,
  onClick,
}: {
  team: WorkerTeamProduct;
  onClick: () => void;
}) {
  const { leaders, workers, skills } = splitTeamMembers(team.members);
  const updatedAt = team.updatedAt || team.createAt;

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group h-[220px] rounded-2xl border border-gray-100/80 bg-white/70 p-5 text-left
        backdrop-blur-sm transition-all duration-300 ease-out
        hover:-translate-y-0.5 hover:border-gray-200/60 hover:bg-white hover:shadow-lg hover:shadow-gray-200/50
        active:scale-[0.98] active:duration-150
      "
    >
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <TeamOutlined />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-gray-800 group-hover:text-gray-900">
              {team.name}
            </h3>
            <div className="mt-0.5 text-xs text-gray-400">v{team.version}</div>
          </div>
          {team.status && (
            <Tag className="mr-0 flex-shrink-0" color="green">
              {team.status}
            </Tag>
          )}
        </div>

        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-gray-500">
          {team.description || "暂无团队说明"}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1">
            <CrownOutlined className="text-amber-500" />
            <span className="truncate">{leaders.length} leader</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1">
            <UserOutlined className="text-blue-500" />
            <span className="truncate">{workers.length} worker</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1">
            <ToolOutlined className="text-emerald-500" />
            <span className="truncate">{skills.length} skill</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-400">
          <div className="flex min-w-0 items-center gap-1 overflow-hidden">
            {(team.tags ?? []).slice(0, 2).map(tag => (
              <span
                key={tag}
                className="rounded-md border border-gray-100 bg-gray-50 px-2 py-0.5 font-medium text-gray-500"
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="flex-shrink-0 tabular-nums">
            {updatedAt ? dayjs(updatedAt).format("YYYY-MM-DD") : "-"}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function WorkerTeamBrowse() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [teams, setTeams] = useState<WorkerTeamProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");

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
        } else {
          setError(response.message || "获取 Worker Teams 失败");
        }
      } catch (err) {
        console.error("Failed to fetch worker teams:", err);
        setError("获取 Worker Teams 失败");
        message.error("获取 Worker Teams 失败");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [currentPage]);

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

  return (
    <Layout>
      <div
        className="flex h-[calc(100vh-96px)] flex-col overflow-auto scrollbar-hide"
        ref={scrollContainerRef}
      >
        <div className="py-6 text-center">
          <h1 className="mb-3 text-4xl font-bold">Worker Teams</h1>
          <p className="text-base text-gray-500">
            浏览由 Leader、成员 Worker 和 Skills 组成的团队包
          </p>
        </div>

        <div className="flex flex-shrink-0 justify-center px-6 py-4">
          <div className="w-full max-w-3xl">
            <Input
              placeholder="筛选当前页团队..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onPressEnter={() => setCommittedSearch(searchQuery.trim())}
              size="large"
              suffix={
                <button
                  type="button"
                  onClick={() => setCommittedSearch(searchQuery.trim())}
                  className="rounded-lg bg-black p-2 text-white transition-colors hover:bg-gray-800"
                >
                  <SearchOutlined className="text-lg" />
                </button>
              }
              className="rounded-xl text-base"
            />
          </div>
        </div>

        <div className="flex-1 px-4 pb-4 pt-4">
          {error ? (
            <div className="mx-auto max-w-3xl">
              <Alert
                message="加载失败"
                description={error}
                type="error"
                showIcon
              />
            </div>
          ) : loading ? (
            <CardGridSkeleton count={8} />
          ) : (
            <>
              <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredTeams.map(team => (
                  <TeamCard
                    key={team.productId}
                    team={team}
                    onClick={() => navigate(`/teams/${team.productId}`)}
                  />
                ))}
                {filteredTeams.length === 0 && (
                  <EmptyState productType="WORKER_TEAM" />
                )}
              </div>
              {totalElements > PAGE_SIZE && !committedSearch && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={totalElements}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <BackToTopButton container={scrollContainerRef.current!} />
    </Layout>
  );
}
