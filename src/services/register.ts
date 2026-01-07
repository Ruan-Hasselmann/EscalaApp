import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/services/firebase";

/* =========================
   DOMAIN TYPES
========================= */

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  whatsapp: string;
};

/**
 * REGRA DO SISTEMA:
 * - uid do Auth é a chave soberana
 * - users/{uid} e people/{uid} DEVEM existir juntos
 * - criação deve ser atômica no Firestore
 */
export async function registerUser({
  name,
  email,
  password,
  whatsapp,
}: RegisterInput) {
  // normalização básica
  const safeName = name.trim();
  const safeEmail = email.trim().toLowerCase();
  const safeWhatsapp = whatsapp.trim();

  try {
    // 1️⃣ Cria no Auth (já autentica automaticamente)
    const cred = await createUserWithEmailAndPassword(
      auth,
      safeEmail,
      password
    );

    const uid = cred.user.uid;

    // 2️⃣ Firestore (users + people) → ATÔMICO
    const batch = writeBatch(db);

    batch.set(doc(db, "users", uid), {
      name: safeName,
      email: safeEmail,

      // permissões
      roles: ["member"],       // papéis possíveis
      activeRole: "member",    // papel atual

      active: true,
      createdAt: serverTimestamp(),
    });

    batch.set(doc(db, "people", uid), {
      name: safeName,
      email: safeEmail,
      whatsapp: safeWhatsapp,
      active: true,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    // 3️⃣ Login automático já está ativo via Auth
    return uid;
  } catch (error) {
    /**
     * IMPORTANTE:
     * - Se falhar após criar no Auth, o usuário pode ficar "órfão"
     * - Limpeza completa exige Admin SDK (backend)
     * - Esse cenário deve ser monitorado/logado
     */
    console.error("[registerUser] erro ao registrar usuário", error);
    throw error;
  }
}
