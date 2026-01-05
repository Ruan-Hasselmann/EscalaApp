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
  serviceDate: string;
  year: number;
  month: number;
  status: ScheduleStatus;
  assignments: ScheduleAssignment[];
  flags: ScheduleFlag[];
  generatedAt: number;
  generatedBy: string;
};

/* =========================
   🔥 FIXED NAME CONFLICTS (SOBERANO)
   Regra por CULTO: serviceDate + serviceId
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
    const items: Schedule[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Schedule, "id">),
    }));
    callback(items);
  });
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
   HELPERS
========================= */

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

/**
 * 🔥 Busca todas as escalas do MESMO CULTO
 * (serviceDate + serviceId), draft + published
 */
async function listSchedulesForSameService(
  serviceDate: string,
  serviceId: string
): Promise<Schedule[]> {
  const q = query(
    collection(db, "schedules"),
    where("serviceDate", "==", serviceDate),
    where("serviceId", "==", serviceId)
  );

  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Schedule, "id">),
    }))
    .filter(
      (s) => s.status === "draft" || s.status === "published"
    );
}

/* =========================
   USERS HELPERS
========================= */

async function listUserNamesByUids(uids: string[]) {
  const unique = Array.from(new Set(uids)).filter(Boolean);
  if (!unique.length) return {};

  const map: Record<string, string> = {};

  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);

    const q = query(
      collection(db, "users"),
      where(documentId(), "in", chunk)
    );

    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      map[d.id] = String(d.data().name ?? "");
    });
  }

  return map;
}

/* =========================
   UPDATE ASSIGNMENT (MANUAL)
   🔥 REGRA SOBERANA APLICADA AQUI
========================= */

export async function updateScheduleAssignment(
  scheduleId: string,
  personId: string
) {
  // 1️⃣ Buscar schedule atual
  const snap = await getDocs(
    query(
      collection(db, "schedules"),
      where(documentId(), "==", scheduleId)
    )
  );
  if (snap.empty) return;

  const data = snap.docs[0].data() as Omit<Schedule, "id">;

  const schedule: Schedule = {
    ...data,
    id: snap.docs[0].id,
  };

  // 2️⃣ Buscar TODAS as escalas do MESMO CULTO
  const sameService = await listSchedulesForSameService(
    schedule.serviceDate,
    schedule.serviceId
  );

  const assignedUserIds: string[] = [];
  sameService.forEach((s) => {
    if (s.id === scheduleId) return;
    s.assignments?.forEach((a) =>
      assignedUserIds.push(a.personId)
    );
  });

  // 3️⃣ Buscar nomes reais
  const userNameMap = await listUserNamesByUids([
    personId,
    ...assignedUserIds,
  ]);

  const myName = normalizeFirstName(userNameMap[personId]);
  const assignedNames = assignedUserIds.map((uid) =>
    normalizeFirstName(userNameMap[uid])
  );

  // 4️⃣ 🔥 REGRA SOBERANA — BLOQUEIO TOTAL
  if (
    FIXED_NAME_CONFLICTS.some(
      ([a, b]) =>
        (myName === a && assignedNames.includes(b)) ||
        (myName === b && assignedNames.includes(a))
    )
  ) {
    throw new Error(
      "Conflito fixo: Ruan e Fabiano não podem servir juntos neste culto."
    );
  }

  // 5️⃣ Salvar manualmente
  await updateDoc(doc(db, "schedules", scheduleId), {
    assignments: [
      {
        personId,
        source: "manual",
      },
    ],
  });
}

/* =========================
   QUERIES
========================= */

// 🔹 Para membro / líder
export async function listPublishedSchedulesByMinistryIds(
  ministryIds: string[],
  year: number,
  month: number // 🔥 mês já no formato do banco (1–12)
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

// 🔹 Para admin (status do mês)
export async function listSchedulesStatusByMonth(
  year: number,
  month: number
): Promise<
  {
    ministryId: string;
    status: ScheduleStatus;
  }[]
> {
  const q = query(
    collection(db, "schedules"),
    where("year", "==", year),
    where("month", "==", month)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ministryId: data.ministryId,
      status: data.status,
    };
  });
}