import { AppUserProfile, UserRole } from "@/services/users";


export function hasRole(
  profile: AppUserProfile | null,
  allowed: UserRole[]
): boolean {
  if (!profile) return false;
  if (!profile.active) return false;

  return allowed.includes(profile.activeRole);
}
