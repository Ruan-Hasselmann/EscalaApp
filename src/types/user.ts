/**
 * REGRA DE DOMÍNIO:
 * - uid é a chave soberana (Auth)
 * - roles define os papéis que o usuário PODE assumir
 * - activeRole define o papel ATUAL da sessão
 * - activeRole DEVE existir dentro de roles
 * - admin é papel global
 * - leader é apenas um CONTEXTO permitido (autoridade real vem do membership)
 * - active=false bloqueia qualquer acesso
 */

export type SystemRole = "admin" | "leader" | "member";

export type AppUserProfile = {
  uid: string;
  name: string;
  email: string;

  active: boolean;

  roles: SystemRole[];       // permissões globais possíveis
  activeRole: SystemRole;    // contexto atual da sessão
};
