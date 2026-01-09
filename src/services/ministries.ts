import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  orderBy,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   DOMAIN TYPES
========================= */

/**
 * REGRA DO SISTEMA:
 * - ministries/{id} representa um ministério funcional
 * - active controla visibilidade e uso em escalas
 * - membersCount / leadersCount são CAMPOS DERIVADOS (não persistidos)
 */

export type Ministry = {
  id: string;
  name: string;
  description?: string;
  active: boolean;

  // 🔹 dados agregados (DERIVADOS)
  membersCount?: number;
  leadersCount?: number;
};

/* =========================
   LIST (ONCE)
========================= */

export async function listMinistries(): Promise<Ministry[]> {
  const snap = await getDocs(
    query(collection(db, "ministries"), orderBy("name", "asc"))
  );

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
  const q = query(
    collection(db, "ministries"),
    orderBy("name", "asc")
  );

  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Ministry, "id">),
      }))
    );
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
    updatedAt: serverTimestamp(),
  });
}

/* =========================
   MAP HELPERS
========================= */

/**
 * Retorna mapa id -> nome
 * Inclui TODOS os ministérios (ativos e inativos)
 * Uso: labels, escalas, relatórios
 */
export async function getMinistryMap(): Promise<Record<string, string>> {
  const snap = await getDocs(
    query(collection(db, "ministries"), orderBy("name", "asc"))
  );

  const map: Record<string, string> = {};

  snap.docs.forEach((d) => {
    map[d.id] = String(d.data().name ?? "Ministério");
  });

  return map;
}

/**
 * Listener de mapa simples id -> nome
 * Usado principalmente em telas de escala
 */
export function listenMinistriesSchedule(
  callback: (map: Record<string, string>) => void
) {
  const q = query(
    collection(db, "ministries"),
    orderBy("name", "asc")
  );

  return onSnapshot(q, (snap) => {
    const map: Record<string, string> = {};

    snap.docs.forEach((d) => {
      map[d.id] = String(d.data().name ?? "Ministério");
    });

    callback(map);
  });
}

export async function getMinistryById(
  ministryId: string
): Promise<Ministry | null> {
  const ref = doc(db, "ministries", ministryId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<Ministry, "id">),
  };
}