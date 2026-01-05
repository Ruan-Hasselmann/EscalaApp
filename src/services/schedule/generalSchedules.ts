import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/* =========================
   TYPES
========================= */

export type GeneralSchedule = {
  id: string;
  year: number;
  month: number; // 🔥 1–12 (DOMÍNIO)
  status: "published";
  publishedAt: Date;
};

/* =========================
   QUERIES
========================= */

/**
 * Busca a escala geral de um mês.
 * @param month Mês no formato de domínio (1–12)
 */
export async function getGeneralScheduleByMonth(
  year: number,
  month: number
): Promise<GeneralSchedule | null> {
  const q = query(
    collection(db, "generalSchedules"),
    where("year", "==", year),
    where("month", "==", month)
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  const d = snap.docs[0];

  return {
    id: d.id,
    ...(d.data() as Omit<GeneralSchedule, "id">),
  };
}

/* =========================
   MUTATIONS
========================= */

/**
 * Publica a escala geral de um mês.
 * @param month Mês no formato de domínio (1–12)
 */
export async function publishGeneralSchedule(
  year: number,
  month: number
) {
  await addDoc(collection(db, "generalSchedules"), {
    year,
    month,
    status: "published",
    publishedAt: serverTimestamp(),
  });
}
