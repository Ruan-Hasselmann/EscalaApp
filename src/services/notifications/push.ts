import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/services/firebase";

/* =========================
   TYPES
========================= */

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
};

/* =========================
   SERVICE
========================= */

export async function sendPushNotifications(params: {
  userIds: string[];
  payload: PushPayload;
}) {
  const { userIds, payload } = params;
  if (userIds.length === 0) return;

  try {
    // 🔹 Buscar tokens dos usuários
    const q = query(
      collection(db, "pushTokens"),
      where("userId", "in", userIds)
    );

    const snap = await getDocs(q);
    if (snap.empty) return;

    const tokens = snap.docs
      .map((d) => d.data().token)
      .filter(Boolean);

    if (tokens.length === 0) return;

    // 🔹 Montar mensagens para Expo
    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    // 🔹 Enviar para Expo Push API
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    // ❌ nunca quebra o fluxo principal
    console.warn("[push] erro ao enviar push", error);
  }
}
