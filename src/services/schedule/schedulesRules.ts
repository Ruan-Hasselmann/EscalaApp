import { ScheduleDoc } from "./scheduleGenerator";

/* =========================
   FLAGS PARA MODAL
========================= */

export type EditableMemberFlag =
  | {
    type: "fixed_person_conflict";
    message: string;
  }
  | {
    type: "same_service_conflict";
    message: string;
  }
  | {
    type: "same_day_conflict";
    message: string;
  }
    | {
    type: "same_day_multiple_services";
    message: string;
  }
  | {
    type: "blocked";
    message: string;
  };

/* =========================
   HELPERS
========================= */

function normalizeFirstName(name: string) {
  return (name ?? "").trim().split(" ")[0].toLowerCase();
}

function isRuanFabianoConflict(nameA: string, nameB: string) {
  const a = normalizeFirstName(nameA);
  const b = normalizeFirstName(nameB);

  return (
    (a === "ruan" && b === "fabiano") ||
    (a === "fabiano" && b === "ruan")
  );
}

/* =========================
   MAIN EVALUATOR
========================= */

export type EvaluateParams = {
  candidateUserId: string;

  // pessoas já escaladas neste culto (qualquer ministério)
  assignedUserIdsInService: string[];

  // pessoas já escaladas neste dia
  assignedUserIdsInDay: string[];

  // mapa de nomes (para regra soberana)
  usersMap: Record<string, { name: string }>;
};

export function evaluateMemberForSchedule({
  candidateUserId,
  assignedUserIdsInService,
  assignedUserIdsInDay,
  usersMap,
}: EvaluateParams): EditableMemberFlag[] {
  const flags: EditableMemberFlag[] = [];

  /* =====================================================
     REGRA 0 — RUAN x FABIANO (SOBERANA, OCULTA)
     ❗ NÃO gera flag visual
  ====================================================== */
  for (const otherId of assignedUserIdsInService) {
    const a = usersMap[candidateUserId]?.name ?? "";
    const b = usersMap[otherId]?.name ?? "";

    if (isRuanFabianoConflict(a, b)) {
      return [
        {
          type: "blocked",
          message: "Não é possivel escalar nesse dia",
        },
      ];
    }
  }

  /* =====================================================
     REGRA 1 — MESMO CULTO
  ====================================================== */
  if (assignedUserIdsInService.includes(candidateUserId)) {
    flags.push({
      type: "same_service_conflict",
      message: "Já está escalado neste culto.",
    });
  }

  /* =====================================================
     REGRA 2 — MESMO DIA
  ====================================================== */
  if (assignedUserIdsInDay.includes(candidateUserId)) {
    flags.push({
      type: "same_day_multiple_services",
      message: "Já está escalado em outro culto neste dia.",
    });
  }

  return flags;
}