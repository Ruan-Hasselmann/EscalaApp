/**
 * REGRA DE DOMÍNIO:
 * - Ministry representa um ministério funcional da igreja
 * - active controla uso em escalas, membros e seleções
 * - Desativar NÃO remove histórico
 */

export type Ministry = {
  id: string;          // docId do Firestore
  name: string;
  active: boolean;

  createdAt?: any;     // Firestore Timestamp
  updatedAt?: any;     // Firestore Timestamp
};
