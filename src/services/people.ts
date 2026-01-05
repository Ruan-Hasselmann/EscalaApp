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

/* =========================
   HELPERS
========================= */

function firstName(name: string) {
  return name
    .trim()
    .split(/\s+/)[0];
}

/**
 * Retorna um mapa:
 * { [personId]: firstName }
 */
export async function getPeopleNamesByIds(
  personIds: string[]
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(personIds)).filter(Boolean);
  if (uniqueIds.length === 0) return {};

  const map: Record<string, string> = {};

  for (let i = 0; i < uniqueIds.length; i += 10) {
    const chunk = uniqueIds.slice(i, i + 10);

    const q = query(
      collection(db, "people"),
      where(documentId(), "in", chunk)
    );

    const snap = await getDocs(q);

    snap.docs.forEach((d) => {
      const fullName = String(d.data().name ?? "—");
      map[d.id] = firstName(fullName);
    });
  }

  return map;
}
