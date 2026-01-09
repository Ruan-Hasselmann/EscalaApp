import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
    addDoc,
    collection,
    getDocs,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";

import { db } from "@/services/firebase";

/* =========================
   REGISTER TOKEN
========================= */

export async function registerPushToken(userId: string) {
    // ❌ simuladores não recebem push
    if (!Device.isDevice || Platform.OS === "web") {
        return;
    }

    // 🔹 permissão
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    // 🔹 token Expo
    const expoToken = await Notifications.getExpoPushTokenAsync();
    const token = expoToken.data;

    if (!token) return;

    const platform = Platform.OS as "android" | "ios";

    // 🔹 verificar se já existe
    const q = query(
        collection(db, "pushTokens"),
        where("userId", "==", userId),
        where("token", "==", token)
    );

    const snap = await getDocs(q);

    // ✅ se já existe, não duplica
    if (!snap.empty) return;

    // ✅ salva novo token
    await addDoc(collection(db, "pushTokens"), {
        userId,
        token,
        platform,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}
