import {
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import {
  notifySchedulesPublished,
} from "@/services/notifications/PublishNotifications";

/* =========================
   TYPES
========================= */

export type PublishContext =
  | {
    type: "service";
    serviceDate: string;
    serviceId: string;
    serviceLabel: string;
    month: number;
    year: number;
  }
  | {
    type: "month";
    month: number;
    year: number;
  };

/* =========================
   PUBLISH BY IDS (CORE)
========================= */

export async function publishSchedulesByIds(params: {
  scheduleIds: string[];
  ministryIds: string[];
  context: PublishContext;
}) {
  const { scheduleIds, ministryIds, context } = params;

  if (scheduleIds.length === 0 || ministryIds.length === 0) return;

  const batch = writeBatch(db);

  for (const id of scheduleIds) {
    batch.update(doc(db, "schedules", id), {
      status: "published",
      publishedAt: serverTimestamp(),
    });
  }

  await batch.commit();

  await notifySchedulesPublished({
    ministryIds,
    context,
  });

}
