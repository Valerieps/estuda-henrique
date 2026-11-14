import { useEffect } from 'react';
import type { MeView, TodayView } from '../application/api-contract';
import { canManageGroup, isUser } from '../domain/group/roles';
import { strings } from '../domain/strings';
import { useLiveStatus, useServices } from './backend-context';
import { Button } from './components/Button';
import { EmptyState } from './components/EmptyState';
import { Notice } from './components/Notice';
import { navigate, usePath } from './router';
import { Invites } from './screens/Invites';
import { Members } from './screens/Members';
import { SignIn } from './screens/SignIn';
import { Settings } from './screens/Settings';
import { Exam } from './screens/Exam';
import { Topic } from './screens/Topic';
import { Worst } from './screens/Worst';
import { Study } from './screens/Study';
import { Subjects } from './screens/Subjects';
import { Today } from './screens/Today';
import { AdminShell, MemberShell } from './Shell';
import { useQuery, type QueryState } from './use-query';

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
      {isUser(me.data) ? <MemberApp me={me.data} onSignOut={onSignOut} /> : <AdminApp me={me.data} onSignOut={onSignOut} />}
    </>
  );
}

function OfflineNotice() {
  const status = useLiveStatus();
  if (status !== 'offline') return null;
  return <Notice>{strings.offline}</Notice>;
}

const empty = strings.empty;

/**
 * The user's screens. Each empty state is replaced by its feature (docs/ROADMAP.md). A user who is
 * also admin reaches Members and Invites from Ajustes.
 */
function MemberApp({ me, onSignOut }: { me: MeView; onSignOut: () => void }) {
  const path = usePath();
  if (path === '/estudo') return <Study />;
  return <MemberShell>{(today) => memberScreen(me, path, onSignOut, today)}</MemberShell>;
}

function memberScreen(me: MeView, path: string, onSignOut: () => void, today: QueryState<TodayView>) {
  const admin = canManageGroup(me);
  if (admin && path === '/membros') return <Members me={me} />;
  if (admin && path === '/convites') return <Invites />;
  switch (path) {
    case '/materias':
      return <Subjects />;
    case '/prova':
      return <Exam />;
    case '/piores':
      return <Worst />;
    case '/ajustes':
      return <Settings admin={admin} onSignOut={onSignOut} />;
    default:
      if (path.startsWith('/topico/')) return <Topic topicId={decodeURIComponent(path.slice('/topico/'.length))} />;
      return <Today today={today} />;
  }
}

/** An admin who is not a user does not study: her home is the system cards, Members and Invites. */
function AdminApp({ me, onSignOut }: { me: MeView; onSignOut: () => void }) {
  const path = usePath();
  return (
    <AdminShell onSignOut={onSignOut}>
      {path === '/membros' ? <Members me={me} /> : path === '/convites' ? <Invites /> : <EmptyState {...empty.systemCards} />}
    </AdminShell>
  );
}
