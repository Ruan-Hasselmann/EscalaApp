import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { UserRole } from "@/services/users";

export async function setActiveRole(
  uid: string,
  role: UserRole
): Promise<void> {
  const ref = doc(db, "users", uid);

  await updateDoc(ref, {
    activeRole: role,
    updatedAt: serverTimestamp(),
  });
}
