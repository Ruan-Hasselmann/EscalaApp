import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { AppUserProfile, SystemRole } from "@/types/user";

/* =========================
   GET
========================= */

export async function getUserProfile(uid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    uid,
    ...(snap.data() as Omit<AppUserProfile, "uid">),
  };
}

/* =========================
   REALTIME
========================= */

export function listenUserProfile(
  uid: string,
  cb: (profile: AppUserProfile | null) => void
) {
  const ref = doc(db, "users", uid);

  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }

    cb({
      uid,
      ...(snap.data() as Omit<AppUserProfile, "uid">),
    });
  });
}

/* =========================
   CREATE
========================= */

export async function createUserProfile(profile: AppUserProfile) {
  const ref = doc(db, "users", profile.uid);

  await setDoc(ref, {
    name: profile.name,
    email: profile.email,
    roles: profile.roles,
    activeRole: profile.activeRole,
  });
}

/* =========================
   UPDATE
========================= */

export async function setActiveRole(
  uid: string,
  role: SystemRole
) {
  const ref = doc(db, "users", uid);

  await updateDoc(ref, {
    activeRole: role,
  });
}
