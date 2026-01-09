import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  orderBy,
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
  createdAt?: any;
  updatedAt?: any;
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
    where("active", "==", true),
    orderBy("createdAt", "asc")
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
  const q = query(
    collection(db, "memberships"),
    where("active", "==", true),
    orderBy("createdAt", "asc")
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
   LISTEN BY USER
========================= */

export function listenMembershipsByUser(
  userId: string,
  callback: (items: Membership[]) => void
) {
  const q = query(
    collection(db, "memberships"),
    where("userId", "==", userId),
    where("active", "==", true),
    orderBy("createdAt", "asc")
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
   UPSERT (REAL)
========================= */

export async function upsertMembership(
  userId: string,
  ministryId: string,
  role: MembershipRole
) {
  const q = query(
    collection(db, "memberships"),
    where("userId", "==", userId),
    where("ministryId", "==", ministryId)
  );

  const snap = await getDocs(q);

  // Já existe → reativa e ajusta role
  if (!snap.empty) {
    const ref = doc(db, "memberships", snap.docs[0].id);
    await updateDoc(ref, {
      role,
      active: true,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  // Não existe → cria novo
  await addDoc(collection(db, "memberships"), {
    userId,
    ministryId,
    role,
    active: true,
    createdAt: serverTimestamp(),
  });
}

/* =========================
   UPDATE ROLE
========================= */

export async function updateMembershipRole(
  membershipId: string,
  role: MembershipRole
) {
  await updateDoc(doc(db, "memberships", membershipId), {
    role,
    updatedAt: serverTimestamp(),
  });
}

/* =========================
   SOFT REMOVE
========================= */

export async function removeMembership(membershipId: string) {
  await updateDoc(doc(db, "memberships", membershipId), {
    active: false,
    updatedAt: serverTimestamp(),
  });
}
