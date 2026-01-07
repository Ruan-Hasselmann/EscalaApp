import { Membership } from "@/services/memberships";

/**
 * REGRA DE DOMÍNIO:
 * - admin é papel GLOBAL
 * - leader é papel CONTEXTUAL (basta 1 membership ativo como leader)
 * - member é sempre permitido
 *
 * Precedência:
 * 1) admin
 * 2) leader
 * 3) member
 */
export type AllowedRole = "admin" | "leader" | "member";

export function resolveAllowedRoles(
  isAdmin: boolean,
  memberships: Membership[]
): readonly AllowedRole[] {
  if (isAdmin) {
    return ["admin", "leader", "member"];
  }

  const hasActiveLeaderMembership = memberships.some(
    (m) => m.active && m.role === "leader"
  );

  if (hasActiveLeaderMembership) {
    return ["leader", "member"];
  }

  return ["member"];
}
