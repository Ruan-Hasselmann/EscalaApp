import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type ServiceTurnType = "regular" | "special";

export type ServiceTurn = {
  id: string;
  label: string;
  type: ServiceTurnType;

  ministrySlots?: Record<string, number>;
};

export type ServiceDay = {
  id: string;          // dateKey
  dateKey: string;
  year: number;
  month: number;       // 1–12
  day: number;
  dayOfWeek: number;
  services: ServiceTurn[];
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
};

/* =========================
   HELPERS
========================= */

function assertMonth(month: number) {
  if (month < 1 || month > 12) {
    throw new Error(`[serviceDays] Mês inválido: ${month}`);
  }
}

function computeDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

/* =========================
   UPSERT DIA / TURNO
========================= */

type UpsertServiceDayInput = {
  dateKey: string;
  year: number;
  month: number;
  day: number;
  service: ServiceTurn;
};

export async function upsertServiceDay({
  dateKey,
  year,
  month,
  day,
  service,
}: {
  dateKey: string;
  year: number;
  month: number;
  day: number;
  service: ServiceTurn;
}) {
  const ref = doc(db, "serviceDays", dateKey);

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // cria o dia
    await setDoc(ref, {
      dateKey,
      year,
      month,
      day,
      services: [service],
    });
    return;
  }

  const data = snap.data() as ServiceDay;

  const services = data.services ?? [];

  const nextServices = services.some((s) => s.id === service.id)
    ? services.map((s) => (s.id === service.id ? service : s))
    : [...services, service];

  await updateDoc(ref, {
    services: nextServices,
  });
}

/* =========================
   REMOVER TURNO
========================= */

export async function removeServiceFromDay(
  dateKey: string,
  serviceId: string
) {
  const ref = doc(db, "serviceDays", dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const services: ServiceTurn[] = snap.data().services ?? [];
  const next = services.filter((s) => s.id !== serviceId);

  // Se não sobrar nenhum culto → desativa o dia
  if (next.length === 0) {
    await updateDoc(ref, {
      active: false,
      services: [],
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(ref, {
    services: next,
    updatedAt: serverTimestamp(),
  });
}

/* =========================
   SOFT DELETE DIA
========================= */

export async function deactivateServiceDay(dateKey: string) {
  await updateDoc(doc(db, "serviceDays", dateKey), {
    active: false,
    updatedAt: serverTimestamp(),
  });
}

/* =========================
   LISTAR POR MÊS (ADMIN)
========================= */

export function listenServiceDaysByMonth(
  year: number,
  month: number,
  callback: (days: ServiceDay[]) => void
) {
  assertMonth(month);

  const q = query(
    collection(db, "serviceDays"),
    where("year", "==", year),
    where("month", "==", month)
  );

  return onSnapshot(q, (snap) => {
    const days = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceDay, "id">) }))
      .sort((a, b) => a.day - b.day);

    callback(days);
  });
}

/* =========================
   LISTAR DIAS ATIVOS
========================= */

export async function listActiveServiceDaysByMonth(
  year: number,
  month: number
): Promise<ServiceDay[]> {
  assertMonth(month);

  const q = query(
    collection(db, "serviceDays"),
    where("year", "==", year),
    where("month", "==", month),
    where("active", "==", true)
  );

  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceDay, "id">) }))
    .sort((a, b) => a.day - b.day);
}

/* =========================
   COPIAR MÊS ANTERIOR (BATCH)
========================= */

export async function copyServiceDaysFromPreviousMonthByOrder(
  year: number,
  month: number
) {
  assertMonth(month);

  const prev = new Date(year, month - 2, 1);
  const prevYear = prev.getFullYear();
  const prevMonth = prev.getMonth() + 1;

  const snap = await getDocs(
    query(
      collection(db, "serviceDays"),
      where("year", "==", prevYear),
      where("month", "==", prevMonth),
      where("active", "==", true)
    )
  );

  if (snap.empty) return;

  const batch = writeBatch(db);
  const lastDay = new Date(year, month, 0).getDate();

  const byWeekAndOrder: Record<number, Record<number, ServiceDay>> = {};

  snap.docs.forEach((d) => {
    const data = d.data() as ServiceDay;
    const order = Math.floor((data.day - 1) / 7) + 1;

    byWeekAndOrder[data.dayOfWeek] ??= {};
    byWeekAndOrder[data.dayOfWeek][order] = data;
  });

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month - 1, day);
    const dow = date.getDay();
    const order = Math.floor((day - 1) / 7) + 1;

    const source = byWeekAndOrder[dow]?.[order];
    if (!source) continue;

    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const ref = doc(db, "serviceDays", dateKey);

    const exists = await getDoc(ref);
    if (exists.exists()) continue;

    batch.set(ref, {
      dateKey,
      year,
      month,
      day,
      dayOfWeek: dow,
      services: source.services,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}
/* =========================
   DELETE DAY
========================= */

export async function deleteServiceDay(dateKey: string) {
  await deleteDoc(doc(db, "serviceDays", dateKey));
}