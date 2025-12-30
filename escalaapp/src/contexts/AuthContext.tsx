
import { auth, db } from "@/services/firebase";
import { AppUserProfile } from "@/services/users";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";


type AuthContextType = {
  user: User | null;
  profile: AppUserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      // Limpa listener anterior
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

      const ref = doc(db, "users", u.uid);

      // 🔁 Listener em tempo real do profile
      unsubProfile = onSnapshot(ref, (snap) => {
        if (!snap.exists()) return;

        setProfile({
          uid: u.uid,
          ...(snap.data() as Omit<AppUserProfile, "uid">),
        });

        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
