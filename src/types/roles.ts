import { Membership } from "@/services/memberships";

export function resolveAllowedRoles(
  isAdmin: boolean,
  memberships: Membership[]
) {
  if (isAdmin) {
    return ["admin", "leader", "member"] as const;
  }

  const isLeader = memberships.some(
    (m) => m.role === "leader" && m.active
  );

  if (isLeader) {
    return ["leader", "member"] as const;
  }

  return ["member"] as const;
}
