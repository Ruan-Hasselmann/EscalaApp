import { collection, getDocs } from "firebase/firestore";
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
