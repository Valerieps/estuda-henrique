// Roles and what each allows (docs/spec/acesso-e-membros.md). A member may hold both. The server
// checks them on every call; the interface only hides what a member cannot do.
export type Role = 'admin' | 'user';

export const ROLES: readonly Role[] = ['admin', 'user'];

export interface MemberRoles {
  readonly roles: readonly Role[];
}

export function isAdmin(member: MemberRoles): boolean {
  return member.roles.includes('admin');
}

/** The "usuário": studies, with data private to them (ADR-009). */
export function isUser(member: MemberRoles): boolean {
  return member.roles.includes('user');
}

/** Invite and remove members, give and take roles. */
export function canManageGroup(member: MemberRoles): boolean {
  return isAdmin(member);
}

/**
 * Whether a note the member writes is a system card (everyone's) or their own. An admin who is
 * not a user writes system cards; a user writes their own, unless they are also admin and ask for
 * a system card (from the admin's screens).
 */
export function writesSystemCards(member: MemberRoles, wantsSystem: boolean): boolean {
  if (!isAdmin(member)) return false;
  return !isUser(member) || wantsSystem;
}

/**
 * Whether a change leaves the group with at least one admin.
 * `activeAdminIds` are the current admins; `losingAdminId` is the one losing the role or removed.
 */
export function keepsAnAdmin(activeAdminIds: readonly string[], losingAdminId: string): boolean {
  return activeAdminIds.some((id) => id !== losingAdminId);
}

export function normalizeRoles(roles: readonly string[]): Role[] {
  return ROLES.filter((role) => roles.includes(role));
}
