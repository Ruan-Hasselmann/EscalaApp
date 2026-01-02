export type SystemRole = "admin" | "leader" | "member";

export type AppUserProfile = {
  uid: string;
  name: string;
  email: string;
  roles: SystemRole[];       // permissões
  activeRole: SystemRole;    // contexto atual
};
