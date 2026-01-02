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
  id: string; // uid__YYYY-MM-DD
  uid: string;
  dateKey: string; // YYYY-MM-DD
  year: number;
  month: number; // 0-11
  status: MemberAvailabilityStatus;
  updatedAt: number;
};

/* =========================
   HELPERS
========================= */

function docId(uid: string, dateKey: string) {
  return `${uid}__${dateKey}`;
}

/* =========================
   LISTEN BY MONTH (REALTIME)
========================= */

export function listenMemberAvailabilityByMonth(
  uid: string,
  year: number,
  month: number,
  callback: (items: MemberAvailability[]) => void
) {
  const q = query(
    collection(db, "memberAvailability"),
    where("uid", "==", uid),
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
  uid: string,
  dateKey: string,
  year: number,
  month: number,
  status: MemberAvailabilityStatus
) {
  const ref = doc(db, "memberAvailability", docId(uid, dateKey));

  await setDoc(
    ref,
    {
      uid,
      dateKey,
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

export async function clearMemberAvailability(uid: string, dateKey: string) {
  await deleteDoc(doc(db, "memberAvailability", docId(uid, dateKey)));
}

/* =========================
   TOGGLE (none -> available -> unavailable -> none)
========================= */

export async function toggleMemberAvailability(
  uid: string,
  dateKey: string,
  year: number,
  month: number,
  current: MemberAvailabilityStatus | null
) {
  if (!current) {
    await setMemberAvailability(uid, dateKey, year, month, "available");
    return "available";
  }

  if (current === "available") {
    await setMemberAvailability(uid, dateKey, year, month, "unavailable");
    return "unavailable";
  }

  await clearMemberAvailability(uid, dateKey);
  return null;
}
