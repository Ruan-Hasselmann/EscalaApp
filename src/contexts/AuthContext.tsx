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

type AuthContextType = {
  user: User | null;
  profile: AppUserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveRole: (role: AppUserProfile["activeRole"]) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      // limpa listener anterior
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
          setProfile(null);
          setLoading(false);
          return;
        }

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

  async function setActiveRole(
    role: AppUserProfile["activeRole"]
  ) {
    if (!profile) return;

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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
