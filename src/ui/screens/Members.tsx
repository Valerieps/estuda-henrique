import { useState } from 'react';
import type { ApiError, MeView, MemberListItem } from '../../application/api-contract';
import { canManageGroup, ROLES, type Role } from '../../domain/group/roles';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { useQuery } from '../use-query';

function errorText(error: ApiError): string {
  if (error === 'last_admin') return strings.members.lastAdmin;
  if (error === 'forbidden') return strings.forbidden;
  if (error === 'invalid') return strings.members.oneRole;
  return strings.genericError;
}

export function Members({ me }: { me: MeView }) {
  const { backend } = useServices();
  const members = useQuery('members', {}, ['members']);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const manages = canManageGroup(me);

  async function toggleRole(member: MemberListItem, role: Role) {
    const roles = member.roles.includes(role) ? member.roles.filter((r) => r !== role) : [...member.roles, role];
    if (roles.length === 0) {
      setError(strings.members.oneRole);
      return;
    }
    setBusy(member.id);
    const result = await backend.command('member.setRoles', { memberId: member.id, roles });
    setBusy(null);
    setError(result.ok ? null : errorText(result.error));
  }

  async function remove(member: MemberListItem) {
    if (!window.confirm(strings.members.removeConfirm(member.name))) return;
    setBusy(member.id);
    const result = await backend.command('member.remove', { memberId: member.id });
    setBusy(null);
    setError(result.ok ? null : errorText(result.error));
  }

  return (
    <section>
      <h1>{strings.members.title}</h1>
      {members.error && !members.data && <Notice tone="error">{strings.genericError}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {members.data?.length === 1 && <p className="muted">{strings.members.empty}</p>}
      <ul className="list">
        {members.data?.map((member) => (
          <li key={member.id} className="card row">
            {member.photoUrl && <img className="avatar" src={member.photoUrl} alt="" referrerPolicy="no-referrer" />}
            <span className="grow">
              {member.name} {member.id === me.id && <span className="muted">{strings.members.you}</span>}
              <br />
              <span className="muted small">{member.roles.map((role) => strings.members.roleNames[role]).join(' · ')}</span>
              {member.email && (
                <>
                  <br />
                  <span className="muted small">{member.email}</span>
                </>
              )}
            </span>
            {manages && (
              <span className="row" role="group" aria-label={strings.members.rolesOf(member.name)}>
                {ROLES.map((role) => (
                  <Button
                    key={role}
                    variant="secondary"
                    aria-pressed={member.roles.includes(role)}
                    disabled={busy === member.id}
                    onClick={() => void toggleRole(member, role)}
                  >
                    {strings.members.roleNames[role]}
                  </Button>
                ))}
                {member.id !== me.id && (
                  <Button
                    variant="secondary-danger"
                    aria-label={strings.members.removeOf(member.name)}
                    disabled={busy === member.id}
                    onClick={() => void remove(member)}
                  >
                    {strings.members.remove}
                  </Button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
