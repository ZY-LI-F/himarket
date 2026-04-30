import api from "@/lib/api";
import type { ApiResponse } from "@/types";

export interface WorkerTeamProductMember {
  readonly role: string;
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

export interface WorkerTeamProductPage<T> {
  readonly content: readonly T[];
  readonly number: number;
  readonly size: number;
  readonly totalElements: number;
}

export interface GetWorkerTeamProductsParams {
  readonly page?: number;
  readonly size?: number;
  readonly name?: string;
}

const WORKER_TEAM_PRODUCTS_ENDPOINT = "/api/admin/worker-team-products";

export const workerTeamProductService = {
  listWorkerTeamProducts: (
    params?: GetWorkerTeamProductsParams
  ): Promise<ApiResponse<WorkerTeamProductPage<WorkerTeamProduct>>> => {
    return api.get<
      unknown,
      ApiResponse<WorkerTeamProductPage<WorkerTeamProduct>>
    >(WORKER_TEAM_PRODUCTS_ENDPOINT, { params });
  },

  getWorkerTeamProduct: (
    productId: string
  ): Promise<ApiResponse<WorkerTeamProduct>> => {
    return api.get<unknown, ApiResponse<WorkerTeamProduct>>(
      `${WORKER_TEAM_PRODUCTS_ENDPOINT}/${encodeURIComponent(productId)}`
    );
  },
};
