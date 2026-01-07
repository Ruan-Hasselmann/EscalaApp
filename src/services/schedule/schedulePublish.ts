import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";

/* =========================
   HELPERS
========================= */

function assertMonth1to12(month: number) {
  if (month < 1 || month > 12) {
    throw new Error(`[publishSchedules] month inválido: ${month} (esperado 1–12)`);
  }
}

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
  if (ministryIds.length === 0) return;

  const q = query(
    collection(db, "schedules"),
    where("serviceDate", "==", serviceDate),
    where("serviceId", "==", serviceId),
    where("status", "==", "draft")
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);

  snap.docs.forEach((d) => {
    if (!ministryIds.includes(d.data().ministryId)) return;

    batch.update(doc(db, "schedules", d.id), {
      status: "published",
      publishedAt: serverTimestamp(),
    });
  });

  await batch.commit();
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
  if (ministryIds.length === 0) return;

  assertMonth1to12(month);

  const q = query(
    collection(db, "schedules"),
    where("year", "==", year),
    where("month", "==", month),
    where("status", "==", "draft")
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);

  snap.docs.forEach((d) => {
    if (!ministryIds.includes(d.data().ministryId)) return;

    batch.update(doc(db, "schedules", d.id), {
      status: "published",
      publishedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
