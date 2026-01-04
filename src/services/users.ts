import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type UserRole = "admin" | "leader" | "member";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles: UserRole[]; // ✅ fonte da verdade
};

/* =========================
   REALTIME LISTENER
========================= */

export function listenUsers(
  callback: (users: AppUser[]) => void
) {
  const q = query(
    collection(db, "users"),
    orderBy("name")
  );

  return onSnapshot(q, (snap) => {
    const list: AppUser[] = snap.docs.map((d) => {
      const data = d.data();

      return {
        id: d.id,
        name: data.name,
        email: data.email,
        active: data.active ?? true,
        roles: (data.roles ?? []) as UserRole[],
      };
    });

    callback(list);
  });
}

/* =========================
   GET BY ID
========================= */

export async function getUserById(
  id: string
): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", id));
  if (!snap.exists()) return null;

  const data = snap.data();

  return {
    id: snap.id,
    name: data.name,
    email: data.email,
    active: data.active ?? true,
    roles: (data.roles ?? []) as UserRole[],
  };
}

/* =========================
   TOGGLE ACTIVE
========================= */

export async function toggleUserActive(
  userId: string,
  active: boolean
) {
  await updateDoc(doc(db, "users", userId), { active });
}

/* =========================
   ROLES (GLOBAL)
========================= */

/**
 * Adiciona um role ao usuário (ex: "admin")
 * Usa arrayUnion para evitar duplicação
 */
export async function addUserRole(
  userId: string,
  role: UserRole
) {
  await updateDoc(doc(db, "users", userId), {
    roles: arrayUnion(role),
  });
}

/**
 * Remove um role do usuário (ex: "admin")
 */
export async function removeUserRole(
  userId: string,
  role: UserRole
) {
  await updateDoc(doc(db, "users", userId), {
    roles: arrayRemove(role),
  });
}

/**
 * Toggle específico para admin (caso mais comum)
 */
export async function toggleAdminRole(
  userId: string,
  makeAdmin: boolean
) {
  await updateDoc(doc(db, "users", userId), {
    roles: makeAdmin
      ? arrayUnion("admin")
      : arrayRemove("admin"),
  });
}
