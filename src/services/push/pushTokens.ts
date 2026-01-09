import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { db } from "@/services/firebase";

/* =========================
   REGISTER PUSH TOKEN
========================= */

export async function registerPushToken(userId: string) {
  if (!Device.isDevice) {
    console.log("[push] Not a physical device");
    return;
  }

  // 1. Verificar permissão
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[push] Permission denied");
    return;
  }

  // 2. Gerar token
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  const platform =
    Device.osName === "iOS"
      ? "ios"
      : Device.osName === "Android"
      ? "android"
      : "web";

  // 3. Verificar se token já existe
  const q = query(
    collection(db, "pushTokens"),
    where("userId", "==", userId),
    where("token", "==", token),
    where("active", "==", true)
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
    // Atualiza lastUsedAt
    await updateDoc(snap.docs[0].ref, {
      lastUsedAt: serverTimestamp(),
    });

    console.log("[push] Token already registered");
    return;
  }

  // 4. Criar novo token
  await addDoc(collection(db, "pushTokens"), {
    userId,
    token,
    platform,
    active: true,
    createdAt: serverTimestamp(),
    lastUsedAt: serverTimestamp(),
  });

  console.log("[push] Token registered");
}
