import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type Ministry = {
  id: string;
  name: string;
  description?: string;
  active: boolean;

  // 🔹 dados agregados (não obrigatórios no Firestore)
  membersCount?: number;
  leadersCount?: number;
};

/* =========================
   LIST (ONCE)
========================= */

export async function listMinistries(): Promise<Ministry[]> {
  const snap = await getDocs(collection(db, "ministries"));

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Ministry, "id">),
  }));
}

/* =========================
   LISTEN (REALTIME)
========================= */

export function listenMinistries(
  callback: (ministries: Ministry[]) => void
) {
  return onSnapshot(collection(db, "ministries"), (snap) => {
    const list: Ministry[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Ministry, "id">),
    }));

    callback(list);
  });
}

/* =========================
   TOGGLE ACTIVE
========================= */

export async function toggleMinistryActive(
  ministryId: string,
  active: boolean
) {
  await updateDoc(doc(db, "ministries", ministryId), {
    active,
  });
}

export async function getMinistryMap(): Promise<Record<string, string>> {
  const snap = await getDocs(collection(db, "ministries"));

  const map: Record<string, string> = {};

  snap.docs.forEach((d) => {
    const data = d.data();
    map[d.id] = String(data.name ?? "Ministério");
  });

  return map;
}