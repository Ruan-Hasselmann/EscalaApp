import {
  addDoc,
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Ministry } from "@/types/ministry";

/* =========================
   LIST
========================= */

export async function listMinistries(): Promise<Ministry[]> {
  const snap = await getDocs(collection(db, "ministries"));

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Ministry, "id">),
  }));
}

/* =========================
   CREATE
========================= */

export async function createMinistry(name: string) {
  await addDoc(collection(db, "ministries"), {
    name,
    active: true,
  });
}

/* =========================
   UPDATE
========================= */

export async function setMinistryActive(
  id: string,
  active: boolean
) {
  await updateDoc(doc(db, "ministries", id), { active });
}
