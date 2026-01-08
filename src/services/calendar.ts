import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   HELPERS
========================= */

/**
 * Verifica se existe QUALQUER dado
 * (serviceDays, schedules ou generalSchedules)
 * para um determinado mês.
 *
 * ⚠️ REGRA DE DOMÍNIO:
 * - month deve ser SEMPRE 1–12
 */
export async function hasAnyDataInMonth(
  year: number,
  month: number // 1–12
): Promise<boolean> {
  if (month < 1 || month > 12) {
    throw new Error(
      `[hasAnyDataInMonth] month inválido: ${month} (esperado 1–12)`
    );
  }

  const checks = [
    query(
      collection(db, "serviceDays"),
      where("year", "==", year),
      where("month", "==", month),
      limit(1)
    ),
    query(
      collection(db, "schedules"),
      where("year", "==", year),
      where("month", "==", month),
      limit(1)
    ),
    query(
      collection(db, "generalSchedules"),
      where("year", "==", year),
      where("month", "==", month),
      limit(1)
    ),
  ];

  for (const q of checks) {
    const snap = await getDocs(q);
    if (!snap.empty) return true;
  }

  return false;
}
