import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { getScheduleRulesByMonth } from "@/services/schedule/schedulesRules";

/* =========================
   TYPES
========================= */

export type MembershipRole = "member" | "leader";

export type Membership = {
  id: string;
  userId: string;
  ministryId: string;
  role: MembershipRole;
  active: boolean;
};

export type ServiceTurn = {
  id: string;
  label: string;
  type: "regular" | "special";
};

export type ServiceDay = {
  id: string;
  dateKey: string;
  year: number;
  month: number;
  day: number;
  services: ServiceTurn[];
  active: boolean;
};

export type MemberAvailabilityStatus = "available" | "unavailable" | "pending";

export type MemberAvailability = {
  id: string;
  userId: string;
  dateKey: string;
  serviceId: string;
  year: number;
  month: number;
  status: MemberAvailabilityStatus;
};

export type ScheduleStatus = "draft" | "published";

/* =========================
   FLAGS
========================= */

export type ScheduleFlag =
  | {
      type: "same_day_multiple_services";
      userId: string;
      dateKey: string;
      serviceId: string;
    }
  | {
      type: "same_service_conflict";
      userId: string;
      dateKey: string;
      serviceId: string;
    }
  | {
      type: "fixed_person_conflict";
      userId: string;
      conflictWithUserId: string;
      dateKey: string;
      serviceId: string;
    }
  | {
      type: "config_person_conflict";
      userId: string;
      conflictWithUserId: string;
      dateKey: string;
      serviceId: string;
    }
  | {
      type: "consecutive_services";
      userId: string;
      dateKey: string;
      serviceId: string;
      previousServiceKey: string;
    }
  | {
      type: "overload";
      userId: string;
      current: number;
      limit: number;
    };

export type GeneratedAssignment = {
  userId: string;
  ministryId: string;
  source: "auto";
  flags: ScheduleFlag[];
};

export type ScheduleDoc = {
  id: string;
  ministryId: string;
  serviceDayId: string;
  serviceId: string;
  serviceDate: string; // YYYY-MM-DD
  serviceLabel: string;
  year: number;
  month: number; // 1–12
  status: ScheduleStatus;
  assignments: GeneratedAssignment[];
  flags: ScheduleFlag[];
  generatedAt: any;
  generatedBy: string;
};

export type GenerateSchedulesInput = {
  leaderUserId: string;
  ministryIds: string[];
  year: number;
  month: number; // 1–12
  overwriteDraft?: boolean;
};

export type GenerateSchedulesResult = {
  schedules: ScheduleDoc[];
  flags: ScheduleFlag[];
};

/* =========================
   LOG
========================= */

const log = (msg: string) => console.log(`[AUTO-GEN] ${msg}`);

/* =========================
   HELPERS
========================= */

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function assertMonth1to12(month: number) {
  if (month < 1 || month > 12) {
    throw new Error(`[scheduleGenerator] month inválido: ${month}`);
  }
}

function scheduleDocId(ministryId: string, dateKey: string, serviceId: string) {
  return `${ministryId}__${dateKey}__${serviceId}`;
}

function serviceKey(dateKey: string, serviceId: string) {
  return `${dateKey}__${serviceId}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildServiceOrder(days: ServiceDay[]) {
  const list: { dateKey: string; serviceId: string }[] = [];
  days
    .slice()
    .sort((a, b) => a.day - b.day)
    .forEach((d) =>
      d.services.forEach((s) => list.push({ dateKey: d.dateKey, serviceId: s.id }))
    );
  return list;
}

/* =========================
   FIRESTORE READS
========================= */

async function listServiceDaysByMonth(year: number, month: number) {
  const q = query(
    collection(db, "serviceDays"),
    where("year", "==", year),
    where("month", "==", month),
    where("active", "==", true) // ✅ importante
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ServiceDay, "id">),
  }));
}

async function listMembershipsByMinistryIds(ministryIds: string[]) {
  const all: Membership[] = [];
  for (const part of chunk(ministryIds, 10)) {
    const snap = await getDocs(
      query(
        collection(db, "memberships"),
        where("ministryId", "in", part),
        where("active", "==", true)
      )
    );
    snap.docs.forEach((d) =>
      all.push({ id: d.id, ...(d.data() as Omit<Membership, "id">) })
    );
  }
  return all;
}

async function listMemberAvailabilityByMonth(year: number, month: number) {
  const snap = await getDocs(
    query(
      collection(db, "memberAvailability"),
      where("year", "==", year),
      where("month", "==", month)
    )
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<MemberAvailability, "id">),
  }));
}

async function listSchedulesByMonth(year: number, month: number) {
  const snap = await getDocs(
    query(collection(db, "schedules"), where("year", "==", year), where("month", "==", month))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ScheduleDoc, "id">),
  }));
}

/* =========================
   🔥 NEW: DELETE DRAFTS (WHEN OVERWRITING)
========================= */

async function deleteDraftSchedulesByMonth(year: number, month: number, ministryIds: string[]) {
  if (ministryIds.length === 0) return;

  // Lemos os schedules do mês e apagamos apenas drafts dos ministérios do líder.
  const all = await listSchedulesByMonth(year, month);
  const toDelete = all.filter(
    (s) => s.status === "draft" && ministryIds.includes(s.ministryId)
  );

  if (toDelete.length === 0) return;

  log(`Deleting drafts: ${toDelete.length}`);

  for (const part of chunk(toDelete, 450)) {
    const batch = writeBatch(db);
    part.forEach((s) => batch.delete(doc(db, "schedules", s.id)));
    await batch.commit();
  }
}

/* =========================
   CORE
========================= */

export async function generateAndSaveDraftSchedules(
  input: GenerateSchedulesInput
): Promise<GenerateSchedulesResult> {
  const { leaderUserId, ministryIds, year, month, overwriteDraft = true } = input;

  assertMonth1to12(month);
  if (!ministryIds.length) return { schedules: [], flags: [] };

  // (mantém) regras — ainda não usadas aqui, mas já deixa carregado
  await getScheduleRulesByMonth(year, month);

  // 🔥 Apaga drafts antes de gerar (pra não "parecer que não aconteceu nada")
  if (overwriteDraft) {
    await deleteDraftSchedulesByMonth(year, month, ministryIds);
  }

  const [serviceDays, memberships, availability, existingSchedules] = await Promise.all([
    listServiceDaysByMonth(year, month),
    listMembershipsByMinistryIds(ministryIds),
    listMemberAvailabilityByMonth(year, month),
    listSchedulesByMonth(year, month),
  ]);

  log(`Params: year=${year} month=${month} ministries=${ministryIds.length}`);
  log(
    `Loaded: serviceDays=${serviceDays.length} memberships=${memberships.length} availability=${availability.length} existingSchedules=${existingSchedules.length}`
  );

  const assignedByService = new Map<string, Set<string>>();
  const assignedByDay = new Map<string, Set<string>>();
  const loadByUser = new Map<string, number>();

  const order = buildServiceOrder(serviceDays);
  const serviceIndex = new Map<string, number>();
  order.forEach((o, i) => serviceIndex.set(serviceKey(o.dateKey, o.serviceId), i));

  // Conta carga apenas de published (e de drafts se overwriteDraft=false)
  for (const s of existingSchedules) {
    if (overwriteDraft && s.status === "draft") continue;

    for (const a of s.assignments) {
      const sk = serviceKey(s.serviceDate, s.serviceId);
      assignedByService.set(sk, (assignedByService.get(sk) ?? new Set()).add(a.userId));
      assignedByDay.set(s.serviceDate, (assignedByDay.get(s.serviceDate) ?? new Set()).add(a.userId));
      loadByUser.set(a.userId, (loadByUser.get(a.userId) ?? 0) + 1);
    }
  }

  // (ainda não usamos availability/assignedBy* aqui para escolher, mas mantemos pra evoluir)
  void availability;
  void assignedByService;
  void assignedByDay;
  void serviceIndex;

  const generated: ScheduleDoc[] = [];
  const allFlags: ScheduleFlag[] = [];

  for (const ministryId of ministryIds) {
    const members = memberships.filter((m) => m.ministryId === ministryId && m.active);
    const candidatesBase = shuffle(members.map((m) => m.userId));

    if (candidatesBase.length === 0) continue;

    for (const day of serviceDays) {
      for (const service of day.services) {
        const docId = scheduleDocId(ministryId, day.dateKey, service.id);

        // menor carga primeiro
        const candidates = candidatesBase.slice().sort(
          (a, b) => (loadByUser.get(a) ?? 0) - (loadByUser.get(b) ?? 0)
        );

        const chosen = candidates[0];
        if (!chosen) continue;

        loadByUser.set(chosen, (loadByUser.get(chosen) ?? 0) + 1);

        generated.push({
          id: docId,
          ministryId,
          serviceDayId: day.id,
          serviceId: service.id,
          serviceDate: day.dateKey,
          serviceLabel: service.label,
          year,
          month,
          status: "draft",
          assignments: [
            {
              userId: chosen,
              ministryId,
              source: "auto",
              flags: [],
            },
          ],
          flags: [],
          generatedAt: serverTimestamp(),
          generatedBy: leaderUserId,
        });
      }
    }
  }

  log(`Generated: ${generated.length} schedules`);

  for (const part of chunk(generated, 400)) {
    const batch = writeBatch(db);
    part.forEach((s) => batch.set(doc(db, "schedules", s.id), s));
    await batch.commit();
  }

  return { schedules: generated, flags: allFlags };
}
