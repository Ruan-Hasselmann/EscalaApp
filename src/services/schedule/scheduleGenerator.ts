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

export type ScheduleStatus = "draft" | "published";

export type ScheduleFlag =
  | {
      type: "fixed_person_conflict";
      userId: string;
      conflictWithUserId: string;
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
      type: "same_day_multiple_services";
      userId: string;
      dateKey: string;
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
  serviceDate: string;
  serviceLabel: string;
  year: number;
  month: number;
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
  month: number;
  overwriteDraft?: boolean;
};

export type GenerateSchedulesResult = {
  schedules: ScheduleDoc[];
  flags: ScheduleFlag[];
};

/* =========================
   HELPERS
========================= */

const log = (msg: string) => console.log(`[AUTO-GEN] ${msg}`);

function normalizeFirstName(name: string) {
  return (name ?? "").trim().split(" ")[0].toLowerCase();
}

function isRuanFabianoConflict(a: string, b: string) {
  const x = normalizeFirstName(a);
  const y = normalizeFirstName(b);
  return (
    (x === "ruan" && y === "fabiano") ||
    (x === "fabiano" && y === "ruan")
  );
}

function scheduleDocId(ministryId: string, dateKey: string, serviceId: string) {
  return `${ministryId}__${dateKey}__${serviceId}`;
}

function serviceKey(dateKey: string, serviceId: string) {
  return `${dateKey}__${serviceId}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/* =========================
   FIRESTORE READS
========================= */

async function listUsersMap(): Promise<Record<string, { name: string }>> {
  const snap = await getDocs(collection(db, "users"));
  const map: Record<string, { name: string }> = {};
  snap.docs.forEach((d) => {
    map[d.id] = { name: (d.data() as any)?.name ?? "" };
  });
  return map;
}

async function listServiceDaysByMonth(year: number, month: number) {
  const snap = await getDocs(
    query(
      collection(db, "serviceDays"),
      where("year", "==", year),
      where("month", "==", month),
      where("active", "==", true)
    )
  );

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

async function listSchedulesByMonth(year: number, month: number) {
  const snap = await getDocs(
    query(
      collection(db, "schedules"),
      where("year", "==", year),
      where("month", "==", month)
    )
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ScheduleDoc, "id">),
  }));
}

async function deleteDraftSchedulesByMonth(
  year: number,
  month: number,
  ministryIds: string[]
) {
  const snap = await getDocs(
    query(
      collection(db, "schedules"),
      where("year", "==", year),
      where("month", "==", month),
      where("status", "==", "draft")
    )
  );

  const toDelete = snap.docs.filter((d) =>
    ministryIds.includes((d.data() as any).ministryId)
  );

  for (const part of chunk(toDelete, 450)) {
    const batch = writeBatch(db);
    part.forEach((d) => batch.delete(d.ref));
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

  if (!ministryIds.length) return { schedules: [], flags: [] };

  if (overwriteDraft) {
    await deleteDraftSchedulesByMonth(year, month, ministryIds);
  }

  const [
    serviceDays,
    memberships,
    usersMap,
    existingSchedules,
  ] = await Promise.all([
    listServiceDaysByMonth(year, month),
    listMembershipsByMinistryIds(ministryIds),
    listUsersMap(),
    listSchedulesByMonth(year, month),
  ]);

  /** 🔥 ESTADO GLOBAL DO MÊS */
  const assignedByService = new Map<string, Set<string>>();
  const assignedByDay = new Map<string, Set<string>>();
  const loadByUser = new Map<string, number>();

  for (const s of existingSchedules) {
    for (const a of s.assignments) {
      const sk = serviceKey(s.serviceDate, s.serviceId);

      assignedByService.set(
        sk,
        (assignedByService.get(sk) ?? new Set()).add(a.userId)
      );

      assignedByDay.set(
        s.serviceDate,
        (assignedByDay.get(s.serviceDate) ?? new Set()).add(a.userId)
      );

      loadByUser.set(a.userId, (loadByUser.get(a.userId) ?? 0) + 1);
    }
  }

  const generated: ScheduleDoc[] = [];

  /** 🔥 ORDEM CORRETA: DIA → CULTO → MINISTÉRIO */
  for (const day of serviceDays) {
    for (const service of day.services) {
      const sk = serviceKey(day.dateKey, service.id);
      const dayKey = day.dateKey;

      assignedByService.set(sk, assignedByService.get(sk) ?? new Set());

      for (const ministryId of ministryIds) {
        const members = memberships.filter(
          (m) => m.ministryId === ministryId && m.active
        );

        const candidates = members
          .map((m) => m.userId)
          .filter((userId) => {
            const inService = assignedByService.get(sk)!;
            const inDay = assignedByDay.get(dayKey) ?? new Set();

            for (const otherId of inService) {
              if (
                isRuanFabianoConflict(
                  usersMap[userId]?.name,
                  usersMap[otherId]?.name
                )
              ) {
                return false;
              }
            }

            if (inService.has(userId)) return false;
            if (inDay.has(userId)) return false;

            return true;
          })
          .sort(
            (a, b) =>
              (loadByUser.get(a) ?? 0) - (loadByUser.get(b) ?? 0)
          );

        const chosen = candidates[0];
        if (!chosen) continue;

        assignedByService.get(sk)!.add(chosen);
        assignedByDay.set(
          dayKey,
          (assignedByDay.get(dayKey) ?? new Set()).add(chosen)
        );
        loadByUser.set(chosen, (loadByUser.get(chosen) ?? 0) + 1);

        generated.push({
          id: scheduleDocId(ministryId, day.dateKey, service.id),
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

  for (const part of chunk(generated, 400)) {
    const batch = writeBatch(db);
    part.forEach((s) => batch.set(doc(db, "schedules", s.id), s));
    await batch.commit();
  }

  log(`Generated schedules: ${generated.length}`);

  return { schedules: generated, flags: [] };
}
