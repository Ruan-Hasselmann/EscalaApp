import { auth, db } from "@/services/firebase";
import { AppUserProfile } from "@/types/user";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

/* =========================
   DOMAIN TYPES
========================= */

/**
 * REGRA DE DOMÍNIO:
 * - Auth (Firebase) controla a sessão
 * - users/{uid} é a fonte da verdade do perfil
 * - activeRole DEVE existir dentro de roles
 * - active=false bloqueia acesso global
 */

type AuthContextType = {
  user: User | null;
  profile: AppUserProfile | null;
  loading: boolean; // auth ou profile em resolução
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveRole: (
    role: AppUserProfile["activeRole"]
  ) => Promise<void>;
};

/* =========================
   CONTEXT
========================= */

const AuthContext = createContext<AuthContextType | null>(null);

/* =========================
   PROVIDER
========================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      // limpa listener anterior de profile
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!u) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(u);
      setLoading(true);

      const ref = doc(db, "users", u.uid);

      unsubProfile = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          // estado inválido: usuário autenticado sem profile
          setProfile(null);
          setLoading(false);
          return;
        }

        const data = snap.data();

        setProfile({
          uid: u.uid,
          ...(data as Omit<AppUserProfile, "uid">),
        });

        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  /* =========================
     ACTIONS
  ========================= */

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  async function setActiveRole(
    role: AppUserProfile["activeRole"]
  ) {
    if (!profile) return;

    // defesa de domínio:
    if (!profile.roles.includes(role)) {
      throw new Error(
        `[Auth] activeRole inválido: ${role} não existe em roles`
      );
    }

    await updateDoc(doc(db, "users", profile.uid), {
      activeRole: role,
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        logout,
        setActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================
   HOOK
========================= */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
