/**
 * REGRA DE DOMÍNIO:
 * - Membership representa o vínculo entre um usuário e um ministério
 * - Um usuário pode participar de vários ministérios
 * - Para o MESMO ministério, só pode existir 1 membership ATIVO por usuário
 * - userId é o uid do Auth (chave soberana)
 * - leader é um papel CONTEXTUAL (não global)
 * - admin NÃO é membership
 */

export type MinistryRole = "leader" | "member";

export type Membership = {
  id: string;           // id do documento (≠ userId)
  userId: string;       // uid do Auth
  ministryId: string;
  role: MinistryRole;
  active: boolean;      // soft delete / histórico

  createdAt?: any;      // Firestore Timestamp
  updatedAt?: any;      // Firestore Timestamp
};
