import { useEffect } from 'react';
import { canManageGroup } from '../domain/group/roles';
import { strings } from '../domain/strings';
import { useLiveStatus, useServices } from './backend-context';
import { Button } from './components/Button';
import { EmptyState } from './components/EmptyState';
import { Notice } from './components/Notice';
import { navigate, usePath } from './router';
import { Invites } from './screens/Invites';
import { Members } from './screens/Members';
import { SignIn } from './screens/SignIn';
import { Exam } from './screens/Exam';
import { Study } from './screens/Study';
import { Subjects } from './screens/Subjects';
import { AdminShell, MemberShell } from './Shell';
import { useQuery } from './use-query';

export function App() {
  const { backend, live } = useServices();
  const me = useQuery('me', {}, ['me']);
  const signedIn = me.data !== undefined && me.error !== 'unauthenticated';

  useEffect(() => {
    if (!signedIn) return;
    live.start();
    return () => live.stop();
  }, [live, signedIn]);

  if (me.loading && !me.data) return null;
  if (!me.data && me.error && me.error !== 'unauthenticated') {
    return (
      <main className="screen">
        <Notice tone="error">{strings.genericError}</Notice>
        <Button onClick={me.reload}>{strings.retry}</Button>
      </main>
    );
  }
  if (!signedIn || !me.data) return <SignIn />;

  async function signOut() {
    await backend.signOut();
    navigate('/', { replace: true });
    me.reload();
  }

  const onSignOut = () => void signOut();
  return (
    <>
      <OfflineNotice />
      {canManageGroup(me.data) ? <AdminApp me={me.data} onSignOut={onSignOut} /> : <MemberApp onSignOut={onSignOut} />}
    </>
  );
}

function OfflineNotice() {
  const status = useLiveStatus();
  if (status !== 'offline') return null;
  return <Notice>{strings.offline}</Notice>;
}

const empty = strings.empty;

/** The student's screens. Each empty state is replaced by its feature (docs/ROADMAP.md). */
function MemberApp({ onSignOut }: { onSignOut: () => void }) {
  const path = usePath();
  if (path === '/estudo') return <Study />;
  return <MemberShell>{memberScreen(path, onSignOut)}</MemberShell>;
}

function memberScreen(path: string, onSignOut: () => void) {
  switch (path) {
    case '/materias':
      return <Subjects />;
    case '/prova':
      return <Exam />;
    case '/piores':
      return <EmptyState {...empty.worst} />;
    case '/ajustes':
      return (
        <EmptyState {...empty.settings}>
          <Button variant="secondary" onClick={onSignOut}>
            {strings.nav.signOut}
          </Button>
        </EmptyState>
      );
    default:
      return <EmptyState {...empty.today} />;
  }
}

/** The admin does not study: her home is the system cards, and Members and Invites are hers alone. */
function AdminApp({ me, onSignOut }: { me: Parameters<typeof Members>[0]['me']; onSignOut: () => void }) {
  const path = usePath();
  return (
    <AdminShell onSignOut={onSignOut}>
      {path === '/membros' ? <Members me={me} /> : path === '/convites' ? <Invites /> : <EmptyState {...empty.systemCards} />}
    </AdminShell>
  );
}
