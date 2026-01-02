import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
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
};

export type ServiceDay = {
  id: string;          // dateKey
  dateKey: string;     // YYYY-MM-DD
  year: number;
  month: number;       // 0-11
  day: number;
  dayOfWeek: number;
  services: ServiceTurn[];
  createdAt: number;
};

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
}: UpsertServiceDayInput) {
  const ref = doc(db, "serviceDays", dateKey);

  const snap = await getDocs(
    query(collection(db, "serviceDays"), where("__name__", "==", dateKey))
  );

  let services: ServiceTurn[] = [];

  if (!snap.empty) {
    services = (snap.docs[0].data().services ?? []) as ServiceTurn[];
  }

  const exists = services.some((s) => s.id === service.id);

  const next = exists
    ? services
    : [...services, service];

  await setDoc(
    ref,
    {
      dateKey,
      year,
      month,
      day,
      dayOfWeek: new Date(year, month, day).getDay(),
      services: next,
      updatedAt: Date.now(),
      createdAt: snap.empty ? Date.now() : snap.docs[0].data().createdAt,
    },
    { merge: true }
  );
}

/* =========================
   REMOVER TURNO
========================= */

export async function removeServiceFromDay(
  dateKey: string,
  serviceId: string
) {
  const ref = doc(db, "serviceDays", dateKey);

  const snap = await getDocs(
    query(collection(db, "serviceDays"), where("__name__", "==", dateKey))
  );

  if (snap.empty) return;

  snap.forEach(async (d) => {
    const data = d.data();
    const services: ServiceTurn[] = data.services ?? [];

    const next = services.filter((s) => s.id !== serviceId);

    await setDoc(
      ref,
      {
        services: next,
      },
      { merge: true }
    );
  });
}

/* =========================
   DELETAR DIA INTEIRO
========================= */

export async function deleteServiceDay(dateKey: string) {
  await deleteDoc(doc(db, "serviceDays", dateKey));
}

/* =========================
   LISTAR POR MÊS (ADMIN)
========================= */

export function listenServiceDaysByMonth(
  year: number,
  month: number,
  callback: (days: ServiceDay[]) => void
) {
  const q = query(
    collection(db, "serviceDays"),
    where("year", "==", year),
    where("month", "==", month)
  );

  return onSnapshot(q, (snap) => {
    const days: ServiceDay[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ServiceDay, "id">),
    }));

    callback(days);
  });
}

/* =========================
   LISTAR DIAS ATIVOS (LÍDER / MEMBRO)
========================= */

export async function listActiveServiceDaysByMonth(
  year: number,
  month: number
): Promise<ServiceDay[]> {
  const q = query(
    collection(db, "serviceDays"),
    where("year", "==", year),
    where("month", "==", month),
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ServiceDay, "id">),
  }));
}

export async function copyServiceDaysFromPreviousMonthByOrder(
  year: number,
  month: number
) {
  const prev = new Date(year, month - 1, 1);
  const prevYear = prev.getFullYear();
  const prevMonth = prev.getMonth();

  // 1️⃣ Busca dias do mês anterior
  const q = query(
    collection(db, "serviceDays"),
    where("year", "==", prevYear),
    where("month", "==", prevMonth)
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  /**
   * Estrutura:
   * {
   *   [dayOfWeek]: {
   *     [order]: ServiceDay
   *   }
   * }
   */
  const byWeekAndOrder: Record<number, Record<number, ServiceDay>> = {};

  snap.docs.forEach((d) => {
    const data = d.data() as ServiceDay;

    const order = Math.floor((data.day - 1) / 7) + 1;

    if (!byWeekAndOrder[data.dayOfWeek]) {
      byWeekAndOrder[data.dayOfWeek] = {};
    }

    byWeekAndOrder[data.dayOfWeek][order] = data;
  });

  // 2️⃣ Percorre dias do mês atual
  const lastDay = new Date(year, month + 1, 0).getDate();

  function toDateKey(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const order = Math.floor((day - 1) / 7) + 1;

    const source = byWeekAndOrder[dayOfWeek]?.[order];
    if (!source) continue;

    const dateKey = toDateKey(date);
    const ref = doc(db, "serviceDays", dateKey);

    // não sobrescreve se já existir
    const exists = await getDocs(
      query(collection(db, "serviceDays"), where("__name__", "==", dateKey))
    );
    if (!exists.empty) continue;

    await setDoc(ref, {
      dateKey,
      year,
      month,
      day,
      dayOfWeek,
      services: source.services,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}