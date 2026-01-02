export type AvailabilityWindowStatus = "open" | "closed";

export type AvailabilityWindow = {
  id: string;

  year: number;
  month: number;          // 0–11

  startDay: number;       // ex: 10
  endDay: number;         // ex: 20

  status: AvailabilityWindowStatus;

  createdAt: Date;
  updatedAt?: Date;
};
