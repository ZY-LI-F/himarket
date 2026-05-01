import { describe, expect, it } from "vitest";
import type {
  WorkerTeamProduct,
  WorkerTeamProductMember,
} from "@/services/workerTeamProduct";
import {
  formatDateTime,
  getLeaderName,
  membersByRole,
  WORKER_TEAM_PRODUCT_COLUMN_KEYS,
} from "./viewModel";

const members: readonly WorkerTeamProductMember[] = [
  {
    role: "member",
    refName: "answer-worker",
    refVersion: "1.0.0",
    ordinal: 2,
  },
  {
    role: "skill",
    refName: "retrieval-skill",
    refVersion: "1.1.0",
    ordinal: 3,
  },
  {
    role: "leader",
    refName: "triage-worker",
    refVersion: "1.0.0",
    ordinal: 1,
  },
];

describe("WorkerTeamProducts view model", () => {
  it("keeps the accepted list columns stable", () => {
    expect(WORKER_TEAM_PRODUCT_COLUMN_KEYS).toEqual([
      "name",
      "version",
      "business_domain",
      "status",
      "leader",
      "updated_at",
    ]);
  });

  it("groups leader, members, and skills closure by role in ordinal order", () => {
    expect(membersByRole(members, "leader")).toEqual([members[2]]);
    expect(membersByRole(members, "member")).toEqual([members[0]]);
    expect(membersByRole(members, "skill")).toEqual([members[1]]);
  });

  it("derives the leader display name from member references", () => {
    const product: WorkerTeamProduct = {
      productId: "team-product-1",
      name: "Support Team",
      version: "1.0.0",
      status: "READY",
      members,
    };

    expect(getLeaderName(product)).toBe("triage-worker@1.0.0");
  });

  it("formats backend timestamps for the updated_at column", () => {
    expect(formatDateTime("2026-04-30T09:08:07")).toBe("2026-04-30 09:08:07");
  });
});
