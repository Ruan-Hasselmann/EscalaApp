import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/* =========================
   TYPES
========================= */

export type ScheduleStatus = "draft" | "published";

export type ScheduleAssignment = {
  userId: string;
  ministryId: string;
  source: "auto" | "manual";
  flags?: ScheduleFlag[];
};

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

export type Schedule = {
  id: string;
  ministryId: string;
  serviceDayId: string;
  serviceId: string;
  serviceLabel: string;
  serviceDate: string;
  year: number;
  month: number; // 1–12
  status: ScheduleStatus;
  assignments: ScheduleAssignment[];
  flags?: ScheduleFlag[];
  generatedAt?: any;
  generatedBy: string;
  publishedAt?: any;
};

/* =========================
   HELPERS
========================= */

function assertMonth(month: number) {
  if (month < 1 || month > 12) {
    throw new Error(`[schedules] Mês inválido: ${month}`);
  }
}

/* =========================
   LISTENERS
========================= */

export function listenSchedulesByMonth(
  year: number,
  month: number,
  callback: (items: Schedule[]) => void
) {
  assertMonth(month);

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
   UPDATE ASSIGNMENTS (SEGURO)
========================= */

// IDs fixos — NUNCA por nome
const FIXED_PERSON_CONFLICTS: [string, string][] = [
  ["UID_RUAN", "UID_FABIANO"],
];

export async function updateScheduleAssignment(
  scheduleId: string,
  userId: string,
  ministryId: string
) {
  const ref = doc(db, "schedules", scheduleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const schedule = snap.data() as Schedule;

  // 🔒 Conflito fixo (mantido)
  const assignedUserIds = schedule.assignments.map((a) => a.userId);

  if (
    FIXED_PERSON_CONFLICTS.some(
      ([a, b]) =>
        (userId === a && assignedUserIds.includes(b)) ||
        (userId === b && assignedUserIds.includes(a))
    )
  ) {
    throw new Error("Conflito fixo entre pessoas neste culto.");
  }

  // ✅ SUBSTITUI assignment do ministério
  const nextAssignments: ScheduleAssignment[] = [
    {
      userId,
      ministryId,
      source: "manual",
      flags: [],
    },
  ];

  await updateDoc(ref, {
    assignments: nextAssignments,
    updatedAt: serverTimestamp(),
  });
}

/* =========================
   PUBLISHED ONLY
========================= */

export function listenPublishedSchedulesByMonth(
  year: number,
  month: number,
  callback: (items: Schedule[]) => void
) {
  const q = query(
    collection(db, "schedules"),
    where("year", "==", year),
    where("month", "==", month),
    where("status", "==", "published")
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

export function listenPublishedSchedulesByMinistryIds(
  ministryIds: string[],
  year: number,
  month: number,
  callback: (items: Schedule[]) => void
) {
  if (ministryIds.length === 0) {
    callback([]);
    return () => { };
  }

  const q = query(
    collection(db, "schedules"),
    where("ministryId", "in", ministryIds),
    where("year", "==", year),
    where("month", "==", month),
    where("status", "==", "published")
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