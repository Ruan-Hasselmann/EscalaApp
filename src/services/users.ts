import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type AppUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
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
    const list: AppUser[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AppUser, "id">),
    }));

    callback(list);
  });
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

export async function getUserById(
  id: string
): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", id));
  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<AppUser, "id">),
  };
}

export async function updateActiveRole(
  userId: string,
  activeRole: "admin" | "leader" | "member"
) {
  await updateDoc(doc(db, "users", userId), {
    activeRole,
  });
}