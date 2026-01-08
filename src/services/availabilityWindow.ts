import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   DOMAIN TYPES
========================= */

/**
 * REGRA DO SISTEMA:
 * - Existe UMA única janela de disponibilidade
 * - Documento fixo: availabilityWindows/current
 * - A disponibilidade SEMPRE vale para o mês seguinte
 */

export type AvailabilityWindow = {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  open: boolean;
  updatedAt?: any;
};

/**
 * Janela resolvida (DERIVADA)
 * NÃO é salva no Firestore
 */
export type AvailabilityWindowResolved = AvailabilityWindow & {
  targetYear: number;
  targetMonth: number; // 1–12 (DOMÍNIO)
};

const REF = doc(db, "availabilityWindows", "current");

/* =========================
   HELPERS
========================= */

/**
 * Retorna o mês de domínio (1–12)
 * para o qual a disponibilidade será aplicada
 */
function getNextMonthTarget() {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    year: target.getFullYear(),
    month: target.getMonth() + 1, // 🔥 domínio 1–12
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
    updatedAt: serverTimestamp(),
  });
}

export async function toggleAvailability(open: boolean) {
  const snap = await getDoc(REF);
  if (!snap.exists()) return;

  await setDoc(
    REF,
    {
      open,
      updatedAt: serverTimestamp(),
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
    const { year, month } = getNextMonthTarget();

    callback({
      ...data,
      targetYear: year,
      targetMonth: month,
    });
  });
}

/* =========================
   DOMAIN HELPER
========================= */

/**
 * Retorna o mês/ano alvo (1–12)
 * usado pela UI e pelas validações de disponibilidade
 */
export function getCurrentAvailabilityTarget() {
  return getNextMonthTarget();
}
