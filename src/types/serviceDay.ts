/**
 * REGRA DE DOMÍNIO:
 * - ServiceDay representa um dia de culto
 * - Identidade é o dateKey (YYYY-MM-DD)
 * - Um dia pode ter múltiplos serviços (turnos/cultos)
 * - Remover o dia = deletar documento (não existe "inactive")
 */

export type ServiceTurnType = "regular" | "special";

export type ServiceTurn = {
  id: string;              // ex: "manha", "noite"
  label: string;           // ex: "Manhã", "Noite"
  type: ServiceTurnType;
};

export type ServiceDay = {
  id: string;              // docId (normalmente o dateKey)
  dateKey: string;         // YYYY-MM-DD

  year: number;
  month: number;           // 🔥 DOMÍNIO 1–12
  day: number;
  dayOfWeek: number;       // 0–6 (Date.getDay)

  services: ServiceTurn[];

  createdAt?: any;         // Firestore Timestamp
  updatedAt?: any;         // Firestore Timestamp
};
