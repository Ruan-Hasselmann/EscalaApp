import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type ScheduleStatus = "draft" | "published";

export type Schedule = {
  id: string;
  ministryId: string;
  serviceDate: string; // YYYY-MM-DD
  serviceLabel: string;
  status: ScheduleStatus;
};

export async function listSchedulesByMonth(
  ministryIds: string[],
  year: number,
  month: number
): Promise<Schedule[]> {
  if (ministryIds.length === 0) return [];

  // intervalo do mês
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  const q = query(
    collection(db, "schedules"),
    where("ministryId", "in", ministryIds),
    where("serviceDate", ">=", start.toISOString().slice(0, 10)),
    where("serviceDate", "<=", end.toISOString().slice(0, 10))
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  }));
}
