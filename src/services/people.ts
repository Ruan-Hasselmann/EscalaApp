import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export type Person = {
  id: string; // uid
  name: string;
  email: string;
  whatsapp?: string;
  active: boolean;
};

export async function listPeople(): Promise<Person[]> {
  const snap = await getDocs(collection(db, "people"));

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Person, "id">),
  }));
}

export async function getPersonById(
  personId: string
): Promise<Person | null> {
  const ref = doc(db, "people", personId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<Person, "id">),
  };
}