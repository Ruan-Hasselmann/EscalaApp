import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type MemberAvailabilityStatus = "available" | "unavailable";

export type MemberAvailability = {
  id: string; // userId__YYYY-MM-DD__serviceId
  userId: string;
  dateKey: string;     // YYYY-MM-DD
  serviceId: string;   // manha | noite | especial | etc
  year: number;
  month: number;       // 0-11
  status: MemberAvailabilityStatus;
  updatedAt: number;
};

/* =========================
   HELPERS
========================= */

function availabilityDocId(
  userId: string,
  dateKey: string,
  serviceId: string
) {
  return `${userId}__${dateKey}__${serviceId}`;
}

/* =========================
   LISTEN BY MONTH (REALTIME)
========================= */

export function listenMemberAvailabilityByMonth(
  userId: string,
  year: number,
  month: number,
  callback: (items: MemberAvailability[]) => void
) {
  const q = query(
    collection(db, "memberAvailability"),
    where("userId", "==", userId),
    where("year", "==", year),
    where("month", "==", month)
  );

  return onSnapshot(q, (snap) => {
    const items: MemberAvailability[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<MemberAvailability, "id">),
    }));

    callback(items);
  });
}

/* =========================
   SET STATUS
========================= */

export async function setMemberAvailability(
  userId: string,
  dateKey: string,
  serviceId: string,
  year: number,
  month: number,
  status: MemberAvailabilityStatus
) {
  const ref = doc(
    db,
    "memberAvailability",
    availabilityDocId(userId, dateKey, serviceId)
  );

  await setDoc(
    ref,
    {
      userId,
      dateKey,
      serviceId,
      year,
      month,
      status,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/* =========================
   CLEAR (REMOVE DOC)
========================= */

export async function clearMemberAvailability(
  userId: string,
  dateKey: string,
  serviceId: string
) {
  await deleteDoc(
    doc(
      db,
      "memberAvailability",
      availabilityDocId(userId, dateKey, serviceId)
    )
  );
}

/* =========================
   TOGGLE
   none → available → unavailable → none
========================= */

export async function toggleMemberAvailability(
  userId: string,
  dateKey: string,
  serviceId: string,
  year: number,
  month: number,
  current: MemberAvailabilityStatus | null
): Promise<MemberAvailabilityStatus | null> {
  if (!current) {
    await setMemberAvailability(
      userId,
      dateKey,
      serviceId,
      year,
      month,
      "available"
    );
    return "available";
  }

  if (current === "available") {
    await setMemberAvailability(
      userId,
      dateKey,
      serviceId,
      year,
      month,
      "unavailable"
    );
    return "unavailable";
  }

  await clearMemberAvailability(userId, dateKey, serviceId);
  return null;
}
