/**
 * REGRA DE DOMÍNIO:
 * - Existe UMA única janela de disponibilidade ativa
 * - Documento fixo: availabilityWindows/current
 * - A janela controla QUANDO o membro pode informar disponibilidade
 * - A disponibilidade SEMPRE se aplica ao MÊS SEGUINTE
 */

export type AvailabilityWindowStatus = "open" | "closed";

export type AvailabilityWindow = {
  id: string; // sempre "current"

  year: number;
  month: number;          // 🔥 DOMÍNIO 1–12 (mês alvo da escala)

  startDay: number;       // dia inicial da janela (1–31)
  endDay: number;         // dia final da janela (1–31)

  status: AvailabilityWindowStatus;

  createdAt?: any;        // Firestore Timestamp
  updatedAt?: any;        // Firestore Timestamp
};
