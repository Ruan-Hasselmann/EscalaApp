import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";

export type AdminPerson = {
  uid: string;
  name: string;
  whatsapp: string;
  active: boolean;
  activeRole: "member" | "leader" | "admin";
};

export async function listAdminPeople(): Promise<AdminPerson[]> {
  const usersSnap = await getDocs(collection(db, "users"));
  const peopleSnap = await getDocs(collection(db, "people"));

  const peopleMap: Record<string, any> = {};
  peopleSnap.docs.forEach((d) => {
    peopleMap[d.id] = d.data();
  });

  return usersSnap.docs.map((u) => {
    const user = u.data();
    const person = peopleMap[u.id];

    return {
      uid: u.id,
      name: user.name,
      activeRole: user.activeRole,
      active: user.active,
      whatsapp: person?.whatsapp ?? "",
    };
  });
}

export async function setActiveRole(
  uid: string,
  role: "member" | "leader" | "admin"
) {
  await updateDoc(doc(db, "users", uid), {
    activeRole: role,
  });
}

export async function setUserActive(uid: string, active: boolean) {
  await updateDoc(doc(db, "users", uid), {
    active,
  });

  await updateDoc(doc(db, "people", uid), {
    active,
  });
}
