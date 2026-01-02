import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Membership, MinistryRole } from "@/types/membership";

/* =========================
   LIST
========================= */

export async function listMembershipsByUser(
  userId: string
): Promise<Membership[]> {
  const q = query(
    collection(db, "memberships"),
    where("userId", "==", userId),
    where("active", "==", true)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Membership, "id">),
  }));
}

/* =========================
   CREATE
========================= */

export async function addMembership(
  userId: string,
  ministryId: string,
  role: MinistryRole
) {
  await addDoc(collection(db, "memberships"), {
    userId,
    ministryId,
    role,
    active: true,
  });
}

/* =========================
   UPDATE
========================= */

export async function setMembershipRole(
  id: string,
  role: MinistryRole
) {
  await updateDoc(doc(db, "memberships", id), { role });
}

export async function setMembershipActive(
  id: string,
  active: boolean
) {
  await updateDoc(doc(db, "memberships", id), { active });
}
