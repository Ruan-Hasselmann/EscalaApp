export type ServiceTurn = "manhã" | "tarde" | "noite";

export type ServiceDay = {
  id: string;
  date: string;          // YYYY-MM-DD
  turns: ServiceTurn[];
  active: boolean;
};
