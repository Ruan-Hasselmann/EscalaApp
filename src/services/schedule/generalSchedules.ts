import {
  addDoc,
  collection,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

/* =========================
   TYPES
========================= */

export type ScheduleStatus = "draft" | "published";

export type ScheduleAssignment = {
  personId: string;
  source: "auto" | "manual";
};

export type Schedule = {
  id: string;
  ministryId: string;
  serviceDayId: string;
  serviceId: string;
  serviceLabel: string;
  serviceDate: string; // YYYY-MM-DD
  year: number;
  month: number; // 🔥 1–12 (DOMÍNIO)
  status: ScheduleStatus;
  assignments: ScheduleAssignment[];
  generatedAt: number;
  generatedBy: string;
};

export type GeneralSchedule = {
  id: string;
  year: number;
  month: number; // 🔥 1–12 (DOMÍNIO)
  status: "published";
  publishedAt: Date;
};

/* =========================
   LISTENERS
========================= */

export function listenSchedulesByMonth(
  year: number,
  month: number,
  callback: (items: Schedule[]) => void
) {
  const q = query(
    collection(db, "schedules"),
    where("year", "==", year),
    where("month", "==", month)
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Schedule, "id">),
    }));
    callback(items);
  });
}

/* =========================
   MUTATIONS
========================= */

export async function publishSchedule(scheduleId: string) {
  await updateDoc(doc(db, "schedules", scheduleId), {
    status: "published",
    publishedAt: Date.now(),
  });
}

export async function revertScheduleToDraft(scheduleId: string) {
  await updateDoc(doc(db, "schedules", scheduleId), {
    status: "draft",
  });
}

/* =========================
   QUERIES (🔥 USADA NA TELA)
========================= */

/**
 * 🔥 Busca TODAS as escalas publicadas de um mês
 * @param month mês no formato de domínio (1–12)
 */
export async function listPublishedSchedulesByMonth(
  year: number,
  month: number
): Promise<Schedule[]> {
  const q = query(
    collection(db, "schedules"),
    where("status", "==", "published"),
    where("year", "==", year),
    where("month", "==", month)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  }));
}

/* =========================
   HELPERS
========================= */

export async function listSchedulesForSameService(
  serviceDate: string,
  serviceId: string
): Promise<Schedule[]> {
  const q = query(
    collection(db, "schedules"),
    where("serviceDate", "==", serviceDate),
    where("serviceId", "==", serviceId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  }));
}

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
 * Publica a escala geral do mês
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