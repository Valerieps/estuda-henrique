import { useState } from 'react';
import type { ApiError, MeView, MemberListItem } from '../../application/api-contract';
import { canManageGroup, isAdmin } from '../../domain/group/roles';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { useQuery } from '../use-query';

function errorText(error: ApiError): string {
  if (error === 'last_admin') return strings.members.lastAdmin;
  if (error === 'forbidden') return strings.forbidden;
  return strings.genericError;
}

export function Members({ me }: { me: MeView }) {
  const { backend } = useServices();
  const members = useQuery('members', {}, ['members']);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const manages = canManageGroup(me);

  async function toggleAdmin(member: MemberListItem) {
    setBusy(member.id);
    const result = await backend.command('member.setRoles', { memberId: member.id, roles: isAdmin(member) ? [] : ['admin'] });
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
              <span className="muted small">{isAdmin(member) ? strings.members.admin : strings.members.member}</span>
              {member.email && (
                <>
                  <br />
                  <span className="muted small">{member.email}</span>
                </>
              )}
            </span>
            {manages && (
              <span className="row" role="group" aria-label={strings.members.rolesOf(member.name)}>
                <Button
                  variant="secondary"
                  aria-pressed={isAdmin(member)}
                  disabled={busy === member.id}
                  onClick={() => void toggleAdmin(member)}
                >
                  {strings.members.makeAdmin}
                </Button>
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
