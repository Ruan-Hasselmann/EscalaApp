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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   DOMAIN TYPES
========================= */

/**
 * REGRA DO SISTEMA:
 * - users/{id} usa uid do Auth como ID
 * - roles é a FONTE DA VERDADE de permissões
 * - active controla acesso global
 */

export type UserRole = "admin" | "leader" | "member";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles: UserRole[];
};

/* =========================
   REALTIME LISTENER
========================= */

export function listenUsers(
  callback: (users: AppUser[]) => void
) {
  const q = query(
    collection(db, "users"),
    orderBy("name", "asc")
  );

  return onSnapshot(q, (snap) => {
    const list: AppUser[] = snap.docs.map((d) => {
      const data = d.data();

      return {
        id: d.id,
        name: String(data.name ?? ""),
        email: String(data.email ?? ""),
        active: Boolean(data.active ?? true),
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
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    active: Boolean(data.active ?? true),
    roles: (data.roles ?? []) as UserRole[],
  };
}

/* =========================
   TOGGLE ACTIVE
========================= */

/**
 * Ativa / desativa usuário
 * ⚠️ REGRA FUTURA:
 * - evitar desativar o último admin do sistema
 */
export async function toggleUserActive(
  userId: string,
  active: boolean
) {
  await updateDoc(doc(db, "users", userId), {
    active,
    updatedAt: serverTimestamp(),
  });
}

/* =========================
   ROLES (GLOBAL)
========================= */

/**
 * Adiciona um role ao usuário
 * Usa arrayUnion para evitar duplicação
 */
export async function addUserRole(
  userId: string,
  role: UserRole
) {
  await updateDoc(doc(db, "users", userId), {
    roles: arrayUnion(role),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remove um role do usuário
 * ⚠️ REGRA FUTURA:
 * - usuário não deve ficar sem role
 */
export async function removeUserRole(
  userId: string,
  role: UserRole
) {
  await updateDoc(doc(db, "users", userId), {
    roles: arrayRemove(role),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Toggle específico para admin
 * (caso mais comum no painel)
 */
export async function toggleAdminRole(
  userId: string,
  makeAdmin: boolean
) {
  await updateDoc(doc(db, "users", userId), {
    roles: makeAdmin
      ? arrayUnion("admin")
      : arrayRemove("admin"),
    updatedAt: serverTimestamp(),
  });
}
