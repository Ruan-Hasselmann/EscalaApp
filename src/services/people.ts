import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   DOMAIN TYPES
========================= */

/**
 * REGRA DO SISTEMA:
 * - people/{id} usa o uid do Auth como ID
 * - Documento representa dados pessoais do usuário
 */

export type Person = {
  id: string; // uid
  name: string;
  email: string;
  whatsapp?: string;
  active: boolean;
};

/* =========================
   QUERIES
========================= */

export async function listPeople(): Promise<Person[]> {
  const snap = await getDocs(
    query(collection(db, "people"), orderBy("name", "asc"))
  );

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

/**
 * Extrai o primeiro nome de forma segura
 * (uso em UI, labels e conflitos visuais)
 */
function firstNameSafe(name?: string) {
  if (!name) return "—";

  const cleaned = String(name).trim();
  if (!cleaned) return "—";

  return cleaned.split(/\s+/)[0];
}

/**
 * Retorna um mapa:
 * { [personId]: firstName }
 *
 * ⚠️ CONTRATO:
 * - Usa coleção `people`
 * - Retorna PRIMEIRO NOME (derivado)
 * - Uso apenas para UI / leitura
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
      map[d.id] = firstNameSafe(d.data().name);
    });
  }

  return map;
}
