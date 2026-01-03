import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

/* =========================
   TYPES
========================= */

export type ScheduleStatus = "draft" | "published";

export type ScheduleFlag =
  | {
    type: "overload";
    personId: string;
    current: number;
    limit: number;
  }
  | {
    type: "conflict_ministry_priority";
    personId: string;
    blockedByMinistryId: string;
    dateKey: string;
    serviceId: string;
  }
  | {
    type: "fixed_person_conflict";
    personId: string;
    conflictWith: string;
    dateKey: string;
    serviceId: string;
  };

export type ScheduleAssignment = {
  personId: string;
  ministryId: string;
  source: "auto" | "manual";
  flags?: ScheduleFlag[];
};

export type Schedule = {
  id: string;

  ministryId: string;
  serviceDayId: string; // dateKey

  serviceId: string;
  serviceLabel: string;
  serviceDate: string; // dateKey

  year: number;
  month: number;

  status: ScheduleStatus;

  assignments: ScheduleAssignment[];
  flags: ScheduleFlag[];

  generatedAt: number;
  generatedBy: string;
};

/* =========================
   LISTENERS
========================= */

/**
 * 🔁 Escalas do mês (admin / visão global)
 */
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
    const items: Schedule[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Schedule, "id">),
    }));

    callback(items);
  });
}

/**
 * 🔁 Escalas por ministério (dashboard líder)
 */
export function listenSchedulesByMinistry(
  ministryId: string,
  year: number,
  month: number,
  callback: (items: Schedule[]) => void
) {
  const q = query(
    collection(db, "schedules"),
    where("ministryId", "==", ministryId),
    where("year", "==", year),
    where("month", "==", month)
  );

  return onSnapshot(q, (snap) => {
    const items: Schedule[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Schedule, "id">),
    }));

    callback(items);
  });
}

/* =========================
   MUTATIONS
========================= */

/**
 * 🟢 Publicar escala
 * Regra: após publicar, não pode ser alterada automaticamente
 */
export async function publishSchedule(scheduleId: string) {
  await updateDoc(doc(db, "schedules", scheduleId), {
    status: "published",
  });
}

/**
 * 🟡 Voltar escala publicada para rascunho
 * Permite edição manual
 */
export async function revertScheduleToDraft(scheduleId: string) {
  await updateDoc(doc(db, "schedules", scheduleId), {
    status: "draft",
  });
}

/* =========================
   HELPERS
========================= */

/**
 * 🔍 Verifica se já existe escala
 * para o mesmo ministério + culto
 * (útil para validações manuais)
 */
export async function existsScheduleForService(
  ministryId: string,
  serviceDayId: string,
  serviceId: string
): Promise<boolean> {
  const q = query(
    collection(db, "schedules"),
    where("ministryId", "==", ministryId),
    where("serviceDayId", "==", serviceDayId),
    where("serviceId", "==", serviceId)
  );

  const snap = await getDocs(q);
  return !snap.empty;
}

export async function updateScheduleAssignment(
  scheduleId: string,
  personId: string
) {
  await updateDoc(doc(db, "schedules", scheduleId), {
    assignments: [
      {
        personId,
        source: "manual",
      },
    ],
  });
}
