import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type DayStatus = "none" | "draft" | "published";

export type LeaderDay = {
  id: string;
  date: string; // YYYY-MM-DD
  status: DayStatus;
};

type ContextType = {
  days: LeaderDay[];
  loading: boolean;
};

const LeaderScheduleContext = createContext<ContextType | null>(null);

export function LeaderScheduleProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = useAuth();
  const [days, setDays] = useState<LeaderDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, "schedules"),
      where("leaderId", "==", profile.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const result: LeaderDay[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LeaderDay, "id">),
      }));

      setDays(result);
      setLoading(false);
    });

    return unsub;
  }, [profile]);

  return (
    <LeaderScheduleContext.Provider value={{ days, loading }}>
      {children}
    </LeaderScheduleContext.Provider>
  );
}

export function useLeaderSchedules() {
  const ctx = useContext(LeaderScheduleContext);
  if (!ctx) {
    throw new Error(
      "useLeaderSchedules must be used within LeaderScheduleProvider"
    );
  }
  return ctx;
}
