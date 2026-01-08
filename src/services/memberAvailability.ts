import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { getCurrentAvailabilityTarget } from "./availabilityWindow";

/* =========================
   DOMAIN TYPES
========================= */

/**
 * REGRA DO SISTEMA:
 * - Disponibilidade sempre pertence ao MÊS ALVO
 * - month é DOMÍNIO 1–12
 * - Limpar disponibilidade = remover documento
 */

export type MemberAvailabilityStatus = "available" | "unavailable";

export type MemberAvailability = {
  id: string; // userId__YYYY-MM-DD__serviceId
  userId: string;
  dateKey: string;     // YYYY-MM-DD (sempre do mês alvo)
  serviceId: string;
  year: number;
  month: number;       // 🔥 1–12 (DOMÍNIO)
  status: MemberAvailabilityStatus;
  updatedAt?: any;
};

/* =========================
   HELPERS
========================= */

function availabilityDocId(
  userId: string,
  dateKey: string,
  serviceId: string
) {
  return `${userId}__${dateKey}__${serviceId}`;
}

/* =========================
   LISTEN BY TARGET MONTH
========================= */

export function listenMemberAvailabilityForTargetMonth(
  userId: string,
  callback: (items: MemberAvailability[]) => void
) {
  const { year, month } = getCurrentAvailabilityTarget();

  const q = query(
    collection(db, "memberAvailability"),
    where("userId", "==", userId),
    where("year", "==", year),
    where("month", "==", month)
  );

  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MemberAvailability, "id">),
      }))
    );
  });
}

/* =========================
   SET STATUS (SAFE)
========================= */

async function setMemberAvailability(
  userId: string,
  dateKey: string,
  serviceId: string,
  status: MemberAvailabilityStatus
) {
  const { year, month } = getCurrentAvailabilityTarget();

  const ref = doc(
    db,
    "memberAvailability",
    availabilityDocId(userId, dateKey, serviceId)
  );

  await setDoc(
    ref,
    {
      userId,
      dateKey,
      serviceId,
      year,
      month,
      status,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/* =========================
   CLEAR
========================= */

export async function clearMemberAvailability(
  userId: string,
  dateKey: string,
  serviceId: string
) {
  await deleteDoc(
    doc(
      db,
      "memberAvailability",
      availabilityDocId(userId, dateKey, serviceId)
    )
  );
}

/* =========================
   TOGGLE
   none → available → unavailable → none
========================= */

export async function toggleMemberAvailability(
  userId: string,
  dateKey: string,
  serviceId: string,
  current: MemberAvailabilityStatus | null
): Promise<MemberAvailabilityStatus | null> {
  if (!current) {
    await setMemberAvailability(
      userId,
      dateKey,
      serviceId,
      "available"
    );
    return "available";
  }

  if (current === "available") {
    await setMemberAvailability(
      userId,
      dateKey,
      serviceId,
      "unavailable"
    );
    return "unavailable";
  }

  await clearMemberAvailability(userId, dateKey, serviceId);
  return null;
}
