import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

/* =========================
   HELPERS
========================= */

function assertMonth1to12(month: number) {
  if (month < 1 || month > 12) {
    throw new Error(`[schedules] month inválido: ${month} (esperado 1–12)`);
  }
}

function generalScheduleId(year: number, month: number) {
  return `${year}__${String(month).padStart(2, "0")}`;
}

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
  month: number; // 1–12
  status: ScheduleStatus;
  assignments: ScheduleAssignment[];
  generatedAt: any;
  generatedBy: string;
  publishedAt?: any;
};

export type GeneralSchedule = {
  id: string;
  year: number;
  month: number; // 1–12
  status: "published";
  publishedAt: any;
};

/* =========================
   LISTENERS
========================= */

export function listenSchedulesByMonth(
  year: number,
  month: number,
  callback: (items: Schedule[]) => void
) {
  assertMonth1to12(month);

  const q = query(
    collection(db, "schedules"),
    where("year", "==", year),
    where("month", "==", month),
    orderBy("serviceDate", "asc")
  );

  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Schedule, "id">),
      }))
    );
  });
}

/* =========================
   MUTATIONS
========================= */

export async function publishSchedule(scheduleId: string) {
  await updateDoc(doc(db, "schedules", scheduleId), {
    status: "published",
    publishedAt: serverTimestamp(),
  });
}

export async function revertScheduleToDraft(scheduleId: string) {
  await updateDoc(doc(db, "schedules", scheduleId), {
    status: "draft",
  });
}

/* =========================
   QUERIES (TELAS)
========================= */

export async function listPublishedSchedulesByMonth(
  year: number,
  month: number
): Promise<Schedule[]> {
  assertMonth1to12(month);

  const q = query(
    collection(db, "schedules"),
    where("status", "==", "published"),
    where("year", "==", year),
    where("month", "==", month),
    orderBy("serviceDate", "asc")
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
  assertMonth1to12(month);

  const ref = doc(db, "generalSchedules", generalScheduleId(year, month));
  const snap = await getDocs(
    query(
      collection(db, "generalSchedules"),
      where("year", "==", year),
      where("month", "==", month)
    )
  );

  if (snap.empty) return null;

  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<GeneralSchedule, "id">) };
}

/* =========================
   GENERAL SCHEDULE
========================= */

export async function publishGeneralSchedule(
  year: number,
  month: number
) {
  assertMonth1to12(month);

  const ref = doc(db, "generalSchedules", generalScheduleId(year, month));

  await setDoc(ref, {
    year,
    month,
    status: "published",
    publishedAt: serverTimestamp(),
  });
}

export function listenGeneralScheduleByMonth(
  year: number,
  month: number,
  callback: (general: GeneralSchedule | null) => void
) {
  assertMonth1to12(month);

  const ref = doc(db, "generalSchedules", generalScheduleId(year, month));

  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }

    callback({
      id: snap.id,
      ...(snap.data() as Omit<GeneralSchedule, "id">),
    });
  });
}
