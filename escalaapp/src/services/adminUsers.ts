import { collection, doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { AppUserProfile, UserRole } from "@/services/users";

export function listenAllUsers(
  onChange: (users: AppUserProfile[]) => void
) {
  const ref = collection(db, "users");

  return onSnapshot(ref, (snap) => {
    const users = snap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<AppUserProfile, "uid">),
    }));
    onChange(users);
  });
}

export async function setUserRoles(
  uid: string,
  roles: UserRole[]
) {
  await updateDoc(doc(db, "users", uid), {
    roles,
    updatedAt: serverTimestamp(),
  });
}
