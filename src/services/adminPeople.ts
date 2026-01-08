import {
  collection,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   DOMAIN TYPES
========================= */

/**
 * REGRA DO SISTEMA:
 * - users/{uid} e people/{uid} compartilham o MESMO ID
 * - uid do Auth é soberano
 */

export type AdminPerson = {
  uid: string;
  name: string;
  whatsapp: string;
  active: boolean;
  activeRole: "member" | "leader" | "admin";
};

type PersonProfile = {
  whatsapp?: string;
  active?: boolean;
};

/* =========================
   QUERIES
========================= */

export async function listAdminPeople(): Promise<AdminPerson[]> {
  const usersSnap = await getDocs(
    query(collection(db, "users"), orderBy("name", "asc"))
  );

  const peopleSnap = await getDocs(collection(db, "people"));

  const peopleMap = new Map<string, PersonProfile>();
  peopleSnap.docs.forEach((d) => {
    peopleMap.set(d.id, d.data() as PersonProfile);
  });

  return usersSnap.docs.map((u) => {
    const user = u.data();
    const person = peopleMap.get(u.id);

    return {
      uid: u.id,
      name: String(user.name ?? ""),
      activeRole: user.activeRole,
      active: Boolean(user.active),
      whatsapp: person?.whatsapp ?? "",
    };
  });
}

/* =========================
   MUTATIONS
========================= */

export async function setActiveRole(
  uid: string,
  role: "member" | "leader" | "admin"
) {
  await updateDoc(doc(db, "users", uid), {
    activeRole: role,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Ativa / desativa usuário de forma ATÔMICA
 * (users + people sempre sincronizados)
 */
export async function setUserActive(uid: string, active: boolean) {
  const batch = writeBatch(db);

  batch.update(doc(db, "users", uid), {
    active,
    updatedAt: serverTimestamp(),
  });

  batch.update(doc(db, "people", uid), {
    active,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}
