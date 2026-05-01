import api from "@/lib/api";

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
  readonly status: string;
  readonly visibility?: string;
  readonly pricing?: unknown;
  readonly tags?: readonly string[];
  readonly members?: readonly WorkerTeamProductMember[];
  readonly createAt?: string;
  readonly updatedAt?: string;
}

export interface WorkerTeamProductPage {
  readonly content: readonly WorkerTeamProduct[];
  readonly number: number;
  readonly size: number;
  readonly totalElements: number;
}

export interface WorkerTeamProductListParams {
  readonly page?: number;
  readonly size?: number;
  readonly name?: string;
}

export interface ApiResponse<T> {
  readonly code?: string;
  readonly message?: string;
  readonly data: T;
}

export const workerTeamProductService = {
  listWorkerTeamProducts(params: WorkerTeamProductListParams) {
    return api.get<
      ApiResponse<WorkerTeamProductPage>,
      ApiResponse<WorkerTeamProductPage>
    >("/worker-team-products", { params });
  },

  getWorkerTeamProduct(productId: string) {
    return api.get<
      ApiResponse<WorkerTeamProduct>,
      ApiResponse<WorkerTeamProduct>
    >(
      `/worker-team-products/${encodeURIComponent(productId)}`
    );
  },
} as const;
