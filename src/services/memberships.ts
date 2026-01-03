import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type MembershipRole = "member" | "leader";

export type Membership = {
  id: string;
  userId: string;
  ministryId: string;
  role: MembershipRole;
  active: boolean;
};

/* =========================
   LISTEN BY MINISTRY
========================= */

export function listenMembershipsByMinistry(
  ministryId: string,
  callback: (items: Membership[]) => void
) {
  const q = query(
    collection(db, "memberships"),
    where("ministryId", "==", ministryId),
    where("active", "==", true)
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Membership, "id">),
    }));
    callback(items);
  });
}

/* =========================
   LISTEN ALL (ADMIN)
========================= */

export function listenMemberships(
  callback: (items: Membership[]) => void
) {
  const q = query(collection(db, "memberships"));

  return onSnapshot(q, (snap) => {
    const items: Membership[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Membership, "id">),
    }));

    callback(items);
  });
}

/* =========================
   LISTEN BY USER
========================= */

export function listenMembershipsByUser(
  userId: string,
  callback: (items: Membership[]) => void
) {
  const q = query(
    collection(db, "memberships"),
    where("userId", "==", userId)
  );

  return onSnapshot(q, (snap) => {
    const items: Membership[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Membership, "id">),
    }));

    callback(items);
  });
}

/* =========================
   UPSERT
========================= */

export async function upsertMembership(
  userId: string,
  ministryId: string,
  role: MembershipRole
) {
  await addDoc(collection(db, "memberships"), {
    userId,
    ministryId,
    role,
    active: true,
  });
}

/* =========================
   UPDATE ROLE
========================= */

export async function updateMembershipRole(
  membershipId: string,
  role: MembershipRole
) {
  await updateDoc(doc(db, "memberships", membershipId), { role });
}

/* =========================
   REMOVE
========================= */

export async function removeMembership(membershipId: string) {
  await deleteDoc(doc(db, "memberships", membershipId));
}
