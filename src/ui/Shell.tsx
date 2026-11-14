import { useCallback, useState, type ReactNode } from 'react';
import { strings } from '../domain/strings';
import { Button } from './components/Button';
import { Sheet } from './components/Sheet';
import { Link, navigate, usePath } from './router';

interface Tab {
  readonly path: string;
  readonly label: string;
}

function TabLinks({ tabs, path }: { tabs: readonly Tab[]; path: string }) {
  return (
    <>
      {tabs.map((tab) => (
        <Link key={tab.path} to={tab.path} aria-current={path === tab.path ? 'page' : undefined}>
          {tab.label}
        </Link>
      ))}
    </>
  );
}

const MEMBER_LEFT: readonly Tab[] = [
  { path: '/', label: strings.nav.today },
  { path: '/materias', label: strings.nav.subjects },
];
const MEMBER_RIGHT: readonly Tab[] = [
  { path: '/prova', label: strings.nav.exam },
  { path: '/piores', label: strings.nav.worst },
];
const ADMIN_TABS: readonly Tab[] = [
  { path: '/', label: strings.nav.systemCards },
  { path: '/membros', label: strings.nav.members },
  { path: '/convites', label: strings.nav.invites },
];

/** The student's frame: top bar, four tabs around the +, and the Criar sheet. */
export function MemberShell({ children }: { children: ReactNode }) {
  const path = usePath();
  const [creating, setCreating] = useState(false);
  const close = useCallback(() => setCreating(false), []);

  function go(to: string) {
    setCreating(false);
    navigate(to);
  }

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand grow">{strings.appName}</span>
        <Link to="/ajustes" aria-current={path === '/ajustes' ? 'page' : undefined}>
          {strings.nav.settings}
        </Link>
      </header>
      <main className="screen">{children}</main>
      <nav className="tabbar" aria-label={strings.nav.main}>
        <TabLinks tabs={MEMBER_LEFT} path={path} />
        <Button className="create" aria-label={strings.nav.create} onClick={() => setCreating(true)}>
          +
        </Button>
        <TabLinks tabs={MEMBER_RIGHT} path={path} />
      </nav>
      {creating && (
        <Sheet title={strings.create.title} onClose={close}>
          <Button onClick={() => go('/cartas/nova')}>{strings.create.newCard}</Button>
          <Button variant="secondary" onClick={() => go('/cartas/colar')}>
            {strings.create.pasteMany}
          </Button>
        </Sheet>
      )}
    </div>
  );
}

/** The admin's frame: she does not study, so no Hoje and no +; her tabs are management screens. */
export function AdminShell({ children, onSignOut }: { children: ReactNode; onSignOut: () => void }) {
  const path = usePath();
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand grow">{strings.appName}</span>
        <Button variant="secondary" onClick={onSignOut}>
          {strings.nav.signOut}
        </Button>
      </header>
      <main className="screen">{children}</main>
      <nav className="tabbar" aria-label={strings.nav.main}>
        <TabLinks tabs={ADMIN_TABS} path={path} />
      </nav>
    </div>
  );
}
