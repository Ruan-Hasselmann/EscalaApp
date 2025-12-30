import { initializeApp } from "firebase/app";
import { Platform } from "react-native";
import type { Auth } from "firebase/auth";
import {
  getAuth,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFBigq0ZkBdqkOZxBkzfPfRczI-oXPH3I",
  authDomain: "escalasapp.firebaseapp.com",
  projectId: "escalasapp",
  storageBucket: "escalasapp.firebasestorage.app",
  messagingSenderId: "1021919585552",
  appId: "1:1021919585552:web:2b0a32292e328123787195",
};

const app = initializeApp(firebaseConfig);

/**
 * ⚠️ IMPORTANTE:
 * Precisamos tipar explicitamente o auth,
 * senão o TS infere como `any`.
 */
let auth: Auth;

if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  const AsyncStorage =
    require("@react-native-async-storage/async-storage").default;

  const { getReactNativePersistence } = require("firebase/auth");

  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db = getFirestore(app);
