import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Retorna todos os ministryIds onde o usuário é líder
 */
export async function listLeaderMinistryIds(
  userId: string
): Promise<string[]> {
  const q = query(
    collection(db, "memberships"),
    where("userId", "==", userId),
    where("role", "==", "leader"),
    where("active", "==", true)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => d.data().ministryId as string);
}
