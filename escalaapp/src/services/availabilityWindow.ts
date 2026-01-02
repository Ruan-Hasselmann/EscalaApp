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

const REF = doc(db, "availabilityWindows", "current");

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
  callback: (data: AvailabilityWindow | null) => void
) {
  return onSnapshot(REF, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }

    callback(snap.data() as AvailabilityWindow);
  });
}
