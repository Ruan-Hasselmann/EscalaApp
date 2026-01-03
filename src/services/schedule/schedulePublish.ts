import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/services/firebase";

/* =========================
   TYPES
========================= */

export type ScheduleStatus = "draft" | "published";

/* =========================
   PUBLISH ONE SERVICE
========================= */

/**
 * Publica TODAS as escalas (draft)
 * de um culto específico (date + service)
 */
export async function publishServiceSchedules(
  serviceDate: string,
  serviceId: string,
  ministryIds: string[]
) {
  const q = query(
    collection(db, "schedules"),
    where("serviceDate", "==", serviceDate),
    where("serviceId", "==", serviceId),
    where("status", "==", "draft")
  );

  const snap = await getDocs(q);

  const updates = snap.docs.filter((d) =>
    ministryIds.includes(d.data().ministryId)
  );

  await Promise.all(
    updates.map((d) =>
      updateDoc(doc(db, "schedules", d.id), {
        status: "published",
      })
    )
  );
}

/* =========================
   PUBLISH ALL (MONTH)
========================= */

/**
 * Publica TODAS as escalas draft
 * do mês para os ministérios do líder
 */
export async function publishAllDraftSchedules(
  year: number,
  month: number,
  ministryIds: string[]
) {
  const q = query(
    collection(db, "schedules"),
    where("year", "==", year),
    where("month", "==", month),
    where("status", "==", "draft")
  );

  const snap = await getDocs(q);

  const updates = snap.docs.filter((d) =>
    ministryIds.includes(d.data().ministryId)
  );

  await Promise.all(
    updates.map((d) =>
      updateDoc(doc(db, "schedules", d.id), {
        status: "published",
      })
    )
  );
}
