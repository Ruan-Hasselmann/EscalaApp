import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";
import { db } from "@/services/firebase";

/* =========================
   TYPES
========================= */

export type AppNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: any;
  relatedEntity?: {
    type: string;
    id: string;
  };
};

/* =========================
   LISTENERS
========================= */

export function listenUserNotifications(
  userId: string,
  callback: (items: AppNotification[]) => void
) {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AppNotification, "id">),
      }))
    );
  });
}

/* =========================
   MUTATIONS
========================= */

export async function markNotificationAsRead(id: string) {
  await updateDoc(doc(db, "notifications", id), {
    read: true,
  });
}
