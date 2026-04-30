import dayjs from "dayjs";
import type {
  WorkerTeamProduct,
  WorkerTeamProductMember,
} from "@/services/workerTeamProduct";

export const WORKER_TEAM_PRODUCT_COLUMN_KEYS = [
  "name",
  "version",
  "business_domain",
  "status",
  "leader",
  "updated_at",
] as const;

const ROLE_LABELS: Record<string, string> = {
  leader: "Leader",
  member: "Member",
  skill: "Skill",
};

export function sortedMembers(
  members?: readonly WorkerTeamProductMember[]
): WorkerTeamProductMember[] {
  return [...(members ?? [])].sort((current, next) => {
    return current.ordinal - next.ordinal;
  });
}

export function membersByRole(
  members: readonly WorkerTeamProductMember[] | undefined,
  role: string
): WorkerTeamProductMember[] {
  const normalizedRole = role.toLowerCase();
  return sortedMembers(members).filter(member => {
    return member.role.toLowerCase() === normalizedRole;
  });
}

export function formatMemberRef(
  member: WorkerTeamProductMember | undefined
): string {
  if (!member) {
    return "-";
  }
  return `${member.refName}@${member.refVersion}`;
}

export function getLeaderName(product: WorkerTeamProduct): string {
  return formatMemberRef(membersByRole(product.members, "leader")[0]);
}

export function formatRoleLabel(role: string): string {
  return ROLE_LABELS[role.toLowerCase()] ?? role;
}

export function formatDateTime(value: string | undefined): string {
  if (!value) {
    return "-";
  }

  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return value;
  }

  return parsed.format("YYYY-MM-DD HH:mm:ss");
}
