export type MinistryRole = "leader" | "member";

export type Membership = {
  id: string;
  userId: string;
  ministryId: string;
  role: MinistryRole;
  active: boolean;
};
