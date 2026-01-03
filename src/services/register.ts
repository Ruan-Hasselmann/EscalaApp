import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/services/firebase";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  whatsapp: string;
};

export async function registerUser({
  name,
  email,
  password,
  whatsapp,
}: RegisterInput) {
  // 1️⃣ Cria no Auth
  const cred = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const uid = cred.user.uid;

  // 2️⃣ users (controle de acesso / role)
  await setDoc(doc(db, "users", uid), {
    name,
    email,
    roles: ["member"],          // 🔑 papel do sistema
    activeRole: "member",
    active: true,
    createdAt: serverTimestamp(),
  });

  // 3️⃣ people (dados pessoais)
  await setDoc(doc(db, "people", uid), {
    name,
    email,
    whatsapp,
    createdAt: serverTimestamp(),
  });

  // 4️⃣ login automático acontece sozinho (Auth já está logado)
}
