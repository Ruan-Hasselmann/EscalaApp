import { collection, doc, documentId, getDoc, getDocs, query, where } from "firebase/firestore";
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

export async function getPeopleNamesByIds(
  userIds: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(userIds)).filter(Boolean);
  if (!unique.length) return {};

  const map: Record<string, string> = {};

  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);

    const q = query(
      collection(db, "people"),
      where("userId", "in", chunk) // 🔥 AQUI É O PONTO-CHAVE
    );

    const snap = await getDocs(q);

    snap.docs.forEach((d) => {
      const data = d.data();
      map[data.userId] = String(data.name ?? "—");
    });
  }

  return map;
}