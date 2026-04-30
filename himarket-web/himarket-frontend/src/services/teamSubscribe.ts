import request, { type RespI } from "../lib/request";
import {
  getConsumerSubscriptions,
  getPrimaryConsumer,
  type ISubscription,
} from "../lib/apis/consumer";

export type WorkerTeamMemberRole = "leader" | "member" | "skill" | string;

export interface WorkerTeamProductMember {
  role: WorkerTeamMemberRole;
  refName: string;
  refVersion: string;
  ordinal: number;
}

export interface WorkerTeamProduct {
  productId: string;
  name: string;
  version: string;
  businessDomain?: string;
  description?: string;
  status?: string;
  visibility?: string;
  pricing?: unknown;
  tags?: string[];
  members?: WorkerTeamProductMember[];
  createAt?: string;
  updatedAt?: string;
}

export interface WorkerTeamPage {
  content: WorkerTeamProduct[];
  number: number;
  size: number;
  totalElements: number;
}

export interface WorkerTeamSubscriptionStatus {
  status: ISubscription["status"];
  subscription: ISubscription;
}

export function listWorkerTeams(params: { page?: number; size?: number }) {
  return request.get<RespI<WorkerTeamPage>, RespI<WorkerTeamPage>>(
    "/api/portal/worker-team-products",
    {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 12,
      },
    }
  );
}

export function getWorkerTeam(productId: string) {
  return request.get<RespI<WorkerTeamProduct>, RespI<WorkerTeamProduct>>(
    `/api/portal/worker-team-products/${encodeURIComponent(productId)}`
  );
}

export function subscribeWorkerTeam(productId: string) {
  return request.post<RespI<ISubscription>, RespI<ISubscription>>(
    "/api/portal/subscriptions/team",
    { productId }
  );
}

export async function getWorkerTeamSubscriptionStatus(
  productId: string
): Promise<WorkerTeamSubscriptionStatus | null> {
  const primaryConsumer = await getPrimaryConsumer();
  if (primaryConsumer.code !== "SUCCESS") {
    throw new Error(
      primaryConsumer.message || "Failed to load primary consumer"
    );
  }
  const consumerId = primaryConsumer.data?.consumerId;
  if (!consumerId) {
    throw new Error(
      "Primary consumer is required before checking subscription status"
    );
  }

  const pageSize = 100;
  let page = 0;
  while (true) {
    const subscriptions = await getConsumerSubscriptions(consumerId, {
      page,
      size: pageSize,
    });
    if (subscriptions.code !== "SUCCESS") {
      throw new Error(subscriptions.message || "Failed to load subscriptions");
    }
    const content = subscriptions.data?.content ?? [];
    const matched = content.find(
      subscription => subscription.productId === productId
    );
    if (matched) {
      return {
        status: matched.status,
        subscription: matched,
      };
    }

    const totalElements = subscriptions.data?.totalElements ?? content.length;
    if (content.length === 0 || (page + 1) * pageSize >= totalElements) {
      return null;
    }
    page += 1;
  }
}

export function sortTeamMembers(
  members: readonly WorkerTeamProductMember[] = []
): WorkerTeamProductMember[] {
  return [...members].sort((left, right) => {
    const leftOrdinal = left.ordinal ?? Number.MAX_SAFE_INTEGER;
    const rightOrdinal = right.ordinal ?? Number.MAX_SAFE_INTEGER;
    return leftOrdinal - rightOrdinal;
  });
}

export function splitTeamMembers(
  members: readonly WorkerTeamProductMember[] = []
) {
  const sorted = sortTeamMembers(members);
  return {
    leaders: sorted.filter(member => member.role === "leader"),
    workers: sorted.filter(member => member.role === "member"),
    skills: sorted.filter(member => member.role === "skill"),
    other: sorted.filter(
      member =>
        member.role !== "leader" &&
        member.role !== "member" &&
        member.role !== "skill"
    ),
  };
}

export function isSubscribedStatus(status?: string | null) {
  return status === "APPROVED";
}
