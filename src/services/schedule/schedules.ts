import {
  collection,
  doc,
  documentId,
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
  serviceDayId: string;
  serviceId: string;
  serviceLabel: string;
  serviceDate: string; // YYYY-MM-DD
  year: number;
  month: number; // 🔥 domínio: 1–12
  status: ScheduleStatus;
  assignments: ScheduleAssignment[];
  flags?: ScheduleFlag[];
  generatedAt: number;
  generatedBy: string;
};

/* =========================
   LISTENERS (onSnapshot)
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

export function listenAllSchedulesByMonth(
  year: number,
  month: number,
  callback: (items: Schedule[]) => void
) {
  return listenSchedulesByMonth(year, month, callback);
}

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
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Schedule, "id">),
    }));
    callback(items);
  });
}

/* =========================
   QUERIES (getDocs)
========================= */

export async function listAllSchedulesByMonth(
  year: number,
  month: number
): Promise<Schedule[]> {
  const q = query(
    collection(db, "schedules"),
    where("year", "==", year),
    where("month", "==", month)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  }));
}

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

export async function listPublishedSchedulesByMinistryIds(
  ministryIds: string[],
  year: number,
  month: number
): Promise<Schedule[]> {
  if (ministryIds.length === 0) return [];

  const q = query(
    collection(db, "schedules"),
    where("status", "==", "published"),
    where("year", "==", year),
    where("month", "==", month),
    where("ministryId", "in", ministryIds)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  }));
}

export async function listSchedulesStatusByMonth(
  year: number,
  month: number
): Promise<{ ministryId: string; status: ScheduleStatus }[]> {
  const q = query(
    collection(db, "schedules"),
    where("year", "==", year),
    where("month", "==", month)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    ministryId: d.data().ministryId,
    status: d.data().status,
  }));
}

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
   UPDATE ASSIGNMENT
========================= */

const FIXED_NAME_CONFLICTS: [string, string][] = [["ruan", "fabiano"]];

function normalizeFirstName(name: string) {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0];
}

async function listUserNamesByUids(uids: string[]) {
  const unique = Array.from(new Set(uids)).filter(Boolean);
  const map: Record<string, string> = {};

  for (let i = 0; i < unique.length; i += 10) {
    const q = query(
      collection(db, "users"),
      where(documentId(), "in", unique.slice(i, i + 10))
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      map[d.id] = String(d.data().name ?? "");
    });
  }

  return map;
}

export async function updateScheduleAssignment(
  scheduleId: string,
  personId: string
) {
  const snap = await getDocs(
    query(
      collection(db, "schedules"),
      where(documentId(), "==", scheduleId)
    )
  );
  if (snap.empty) return;

  const schedule = {
    id: snap.docs[0].id,
    ...(snap.docs[0].data() as Omit<Schedule, "id">),
  };

  const sameService = await listSchedulesForSameService(
    schedule.serviceDate,
    schedule.serviceId
  );

  const assignedUserIds = sameService
    .flatMap((s) => s.assignments.map((a) => a.personId))
    .filter((id) => id !== personId);

  const names = await listUserNamesByUids([
    personId,
    ...assignedUserIds,
  ]);

  const myName = normalizeFirstName(names[personId]);
  const others = assignedUserIds.map((id) =>
    normalizeFirstName(names[id])
  );

  if (
    FIXED_NAME_CONFLICTS.some(
      ([a, b]) =>
        (myName === a && others.includes(b)) ||
        (myName === b && others.includes(a))
    )
  ) {
    throw new Error(
      "Conflito fixo: Ruan e Fabiano não podem servir juntos neste culto."
    );
  }

  await updateDoc(doc(db, "schedules", scheduleId), {
    assignments: [{ personId, source: "manual" }],
  });
}