import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type AvailabilityWindow = {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  open: boolean;
  updatedAt: number;
};

/**
 * Janela resolvida (DERIVADA)
 * Não é salva no Firestore
 */
export type AvailabilityWindowResolved = AvailabilityWindow & {
  targetYear: number;
  targetMonth: number; // 0-based
};

const REF = doc(db, "availabilityWindows", "current");

/* =========================
   HELPERS
========================= */

function getTargetMonth() {
  const now = new Date();

  const target = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  return {
    year: target.getFullYear(),
    month: target.getMonth(),
  };
}

/* =========================
   ADMIN ACTIONS
========================= */

export async function setAvailabilityWindow(
  data: Omit<AvailabilityWindow, "updatedAt">
) {
  await setDoc(REF, {
    ...data,
    updatedAt: Date.now(),
  });
}

export async function toggleAvailability(open: boolean) {
  const snap = await getDoc(REF);
  if (!snap.exists()) return;

  await setDoc(
    REF,
    {
      open,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/* =========================
   READ
========================= */

export function listenAvailabilityWindow(
  callback: (data: AvailabilityWindowResolved | null) => void
) {
  return onSnapshot(REF, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }

    const data = snap.data() as AvailabilityWindow;

    const { year, month } = getTargetMonth();

    callback({
      ...data,
      targetYear: year,
      targetMonth: month,
    });
  });
}

/* =========================
   TARGET MONTH (DOMAIN RULE)
   Disponibilidade sempre vale
   para o mês seguinte
========================= */

export function getCurrentAvailabilityTarget() {
  const now = new Date();

  const target = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  return {
    year: target.getFullYear(),
    month: target.getMonth(), // 0-11
  };
}
