import { db } from "@/services/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export type UserRole = "admin" | "leader" | "member";

export type AppUserProfile = {
  uid: string;
  roles: UserRole[];   // ⬅️ IMPORTANTE (já ajustado)
  activeRole: UserRole;
  active: boolean;
  name?: string;
};

export async function getUserProfile(
  uid: string
): Promise<AppUserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    uid,
    ...(snap.data() as Omit<AppUserProfile, "uid">),
  };
}

export function defaultRolesFor(role: UserRole): UserRole[] {
  if (role === "admin") return ["admin", "leader", "member"];
  if (role === "leader") return ["leader", "member"];
  return ["member"];
}

export async function bootstrapUserProfile(
  uid: string,
  params?: { role?: UserRole; name?: string }
): Promise<AppUserProfile> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return {
      uid,
      ...(snap.data() as Omit<AppUserProfile, "uid">),
    };
  }

  const initialRole: UserRole = params?.role ?? "member";
  const roles = defaultRolesFor(initialRole);

  const profile: Omit<AppUserProfile, "uid"> = {
    roles,
    activeRole: initialRole,
    active: true,
    ...(params?.name ? { name: params.name } : {}),
  };

  await setDoc(ref, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { uid, ...profile };
}