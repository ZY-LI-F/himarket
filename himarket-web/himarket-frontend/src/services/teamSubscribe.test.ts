import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "../lib/request";
import {
  getWorkerTeam,
  listWorkerTeams,
  sortTeamMembers,
  splitTeamMembers,
  subscribeWorkerTeam,
  type WorkerTeamProductMember,
} from "./teamSubscribe";

vi.mock("../lib/request", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("teamSubscribe service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses portal worker team endpoints", async () => {
    vi.mocked(request.get).mockResolvedValue({
      code: "SUCCESS",
      data: { content: [], number: 1, size: 12, totalElements: 0 },
    });
    vi.mocked(request.post).mockResolvedValue({
      code: "SUCCESS",
      data: {
        subscriptionId: "subscription-1",
        consumerId: "consumer-1",
        consumerName: "Consumer",
        productId: "team-1",
        productName: "Team",
        status: "APPROVED",
        createAt: "",
        updatedAt: "",
      },
    });

    await listWorkerTeams({ page: 2, size: 24 });
    await getWorkerTeam("team-1");
    await subscribeWorkerTeam("team-1");

    expect(request.get).toHaveBeenNthCalledWith(
      1,
      "/api/portal/worker-team-products",
      { params: { page: 2, size: 24 } }
    );
    expect(request.get).toHaveBeenNthCalledWith(
      2,
      "/api/portal/worker-team-products/team-1"
    );
    expect(request.post).toHaveBeenCalledWith(
      "/api/portal/subscriptions/team",
      { productId: "team-1" }
    );
  });

  it("sorts and splits members without mutating the input", () => {
    const members: WorkerTeamProductMember[] = [
      { role: "skill", refName: "skill-a", refVersion: "1.0.0", ordinal: 3 },
      { role: "leader", refName: "lead", refVersion: "1.0.0", ordinal: 1 },
      { role: "member", refName: "worker-a", refVersion: "1.0.0", ordinal: 2 },
      { role: "member", refName: "worker-b", refVersion: "1.0.0", ordinal: 4 },
    ];
    const originalOrder = members.map(member => member.refName);

    const sorted = sortTeamMembers(members);
    const groups = splitTeamMembers(members);

    expect(members.map(member => member.refName)).toEqual(originalOrder);
    expect(sorted.map(member => member.refName)).toEqual([
      "lead",
      "worker-a",
      "skill-a",
      "worker-b",
    ]);
    expect(groups.leaders.map(member => member.refName)).toEqual(["lead"]);
    expect(groups.workers.map(member => member.refName)).toEqual([
      "worker-a",
      "worker-b",
    ]);
    expect(groups.skills.map(member => member.refName)).toEqual(["skill-a"]);
  });
});
