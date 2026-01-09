import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";

/* =========================
   TYPES
========================= */

type NotificationType =
  | "schedule_published"
  | "general_schedule_published";

/* =========================
   SERVICE
========================= */

export async function notifyUsers(params: {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
}) {
  const { userIds, type, title, body, relatedEntity } = params;

  const writes = userIds.map((userId) => {
    const data: any = {
      userId,
      type,
      title,
      body,
      read: false,
      createdAt: serverTimestamp(),
    };

    // ✅ só adiciona se existir
    if (relatedEntity) {
      data.relatedEntity = relatedEntity;
    }

    return addDoc(collection(db, "notifications"), data);
  });

  await Promise.all(writes);
}
