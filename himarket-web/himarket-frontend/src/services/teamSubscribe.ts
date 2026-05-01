import request, { type RespI } from "../lib/request";
import {
  getConsumerSubscriptions,
  getPrimaryConsumer,
  type ISubscription,
} from "../lib/apis/consumer";

export type WorkerTeamMemberRole = "leader" | "member" | "skill" | string;

export interface WorkerTeamProductMember {
  readonly role: WorkerTeamMemberRole;
  readonly refName: string;
  readonly refVersion: string;
  readonly ordinal: number;
}

export interface WorkerTeamProduct {
  readonly productId: string;
  readonly name: string;
  readonly version: string;
  readonly businessDomain?: string;
  readonly description?: string;
  readonly status?: string;
  readonly visibility?: string;
  readonly pricing?: unknown;
  readonly tags?: readonly string[];
  readonly members?: readonly WorkerTeamProductMember[];
  readonly createAt?: string;
  readonly updatedAt?: string;
}

export interface WorkerTeamPage {
  readonly content: readonly WorkerTeamProduct[];
  readonly number: number;
  readonly size: number;
  readonly totalElements: number;
}

export interface WorkerTeamSubscriptionStatus {
  readonly status: ISubscription["status"];
  readonly subscription: ISubscription;
}

export function listWorkerTeams(params: {
  readonly page?: number;
  readonly size?: number;
}) {
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
