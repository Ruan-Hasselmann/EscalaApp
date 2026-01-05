import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   HELPERS
========================= */

export async function hasAnyDataInMonth(
  year: number,
  month: number
): Promise<boolean> {
  const checks = [
    query(
      collection(db, "serviceDays"),
      where("year", "==", year),
      where("month", "==", month+1),
      limit(1)
    ),
    query(
      collection(db, "schedules"),
      where("year", "==", year),
      where("month", "==", month+1),
      limit(1)
    ),
    query(
      collection(db, "generalSchedules"),
      where("year", "==", year),
      where("month", "==", month+1),
      limit(1)
    ),
  ];

  for (const q of checks) {
    const snap = await getDocs(q);
    if (!snap.empty) return true;
  }

  return false;
}
