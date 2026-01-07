import { doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

/* =========================
   TYPES
========================= */

export type PersonConflictPair = {
  aUserId: string;
  bUserId: string;
};

export type ScheduleRulesConfig = {
  year: number;
  month: number; // ✅ sempre 1–12

  // Limites
  maxAssignmentsPerPerson: number; // soft limit (gera flag/penaliza)

  // Disponibilidade
  allowPendingAvailability: boolean;

  // Conflitos
  blockSameServiceDuplicate: boolean;
  enablePersonConflicts: boolean;
  personConflicts: PersonConflictPair[];

  // Justiça
  avoidConsecutiveServices: boolean;

  // Meta
  updatedAt?: unknown;
};

/* =========================
   DEFAULTS
========================= */

export const DEFAULT_SCHEDULE_RULES: Omit<
  ScheduleRulesConfig,
  "year" | "month"
> = {
  maxAssignmentsPerPerson: 2,
  allowPendingAvailability: false,

  blockSameServiceDuplicate: true,
  enablePersonConflicts: true,
  personConflicts: [],

  avoidConsecutiveServices: true,
};

/* =========================
   HELPERS
========================= */

function assertMonth(month: number) {
  if (month < 1 || month > 12) {
    throw new Error(
      `[scheduleRules] Mês inválido recebido: ${month}. Esperado 1–12`
    );
  }
}

function rulesDocId(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function normalizeRules(
  year: number,
  month: number,
  data?: Partial<ScheduleRulesConfig>
): ScheduleRulesConfig {
  return {
    year,
    month,
    ...DEFAULT_SCHEDULE_RULES,
    ...data,
    personConflicts: Array.isArray(data?.personConflicts)
      ? data!.personConflicts
      : [],
  };
}

/* =========================
   QUERY
========================= */

export async function getScheduleRulesByMonth(
  year: number,
  month: number // 1–12
): Promise<ScheduleRulesConfig> {
  assertMonth(month);

  const ref = doc(db, "scheduleRules", rulesDocId(year, month));
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.log(
      `[scheduleRules] Nenhuma regra encontrada para ${year}/${month}, usando defaults`
    );

    return normalizeRules(year, month);
  }

  const data = snap.data() as Partial<ScheduleRulesConfig>;

  return normalizeRules(year, month, data);
}
