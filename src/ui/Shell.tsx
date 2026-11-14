import { useCallback, useState, type ReactNode } from 'react';
import type { TodayView } from '../application/api-contract';
import { strings } from '../domain/strings';
import { Button } from './components/Button';
import { Icon, type IconName } from './components/Icon';
import { Notice } from './components/Notice';
import { CreateSheet } from './CreateSheet';
import { Link, usePath } from './router';
import { Flame } from './Streak';
import { useQuery, type QueryState } from './use-query';
import './Shell.css';

interface Tab {
  readonly path: string;
  readonly label: string;
  readonly icon?: IconName;
}

function TabLinks({ tabs, path }: { tabs: readonly Tab[]; path: string }) {
  return (
    <>
      {tabs.map((tab) => (
        <Link key={tab.path} to={tab.path} aria-current={path === tab.path ? 'page' : undefined}>
          {tab.icon && (
            <span className="tab-icon">
              <Icon name={tab.icon} />
            </span>
          )}
          <span className="tab-label">{tab.label}</span>
        </Link>
      ))}
    </>
  );
}

const MEMBER_LEFT: readonly Tab[] = [
  { path: '/', label: strings.nav.today, icon: 'home' },
  { path: '/materias', label: strings.nav.subjects, icon: 'book' },
];
const MEMBER_RIGHT: readonly Tab[] = [
  { path: '/prova', label: strings.nav.exam, icon: 'exam' },
  { path: '/piores', label: strings.nav.worstTab, icon: 'worst' },
];
/** "Estuda Henrique", the second word in the brand color. */
function Brand() {
  const [first, ...rest] = strings.appName.split(' ');
  return (
    <span className="brand grow">
      {first} <em>{rest.join(' ')}</em>
    </span>
  );
}

const ADMIN_TABS: readonly Tab[] = [
  { path: '/', label: strings.nav.systemCards },
  { path: '/membros', label: strings.nav.members },
  { path: '/convites', label: strings.nav.invites },
];

/** The student's frame: top bar, four tabs around the +, and the Criar sheet. */
export function MemberShell({ children }: { children: (today: QueryState<TodayView>) => ReactNode }) {
  const path = usePath();
  const today = useQuery('today', {}, ['study', 'settings', 'cards']);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const close = useCallback(() => setCreating(false), []);
  const done = useCallback((message: string) => {
    setCreating(false);
    setNotice(message);
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="bar-inner">
          <Brand />
          <Flame today={today.data} onReload={today.reload} />
          <Link
            to="/ajustes"
            className="icon-link"
            aria-label={strings.nav.settings}
            aria-current={path === '/ajustes' ? 'page' : undefined}
          >
            <Icon name="gear" />
          </Link>
        </div>
      </header>
      <main className="screen">
        {notice && <Notice>{notice}</Notice>}
        {children(today)}
      </main>
      <nav className="tabbar" aria-label={strings.nav.main}>
        <div className="bar-inner">
          <TabLinks tabs={MEMBER_LEFT} path={path} />
          <Button
            className="create"
            aria-label={strings.nav.create}
            onClick={() => {
              setNotice(null);
              setCreating(true);
            }}
          >
            <Icon name="plus" />
          </Button>
          <TabLinks tabs={MEMBER_RIGHT} path={path} />
        </div>
      </nav>
      {creating && <CreateSheet onClose={close} onDone={done} />}
    </div>
  );
}

/** The admin's frame: she does not study, so no Hoje and no +; her tabs are management screens. */
export function AdminShell({ children, onSignOut }: { children: ReactNode; onSignOut: () => void }) {
  const path = usePath();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="bar-inner">
          <Brand />
          <Button variant="secondary" onClick={onSignOut}>
            {strings.nav.signOut}
          </Button>
        </div>
      </header>
      <main className="screen">{children}</main>
      <nav className="tabbar" aria-label={strings.nav.main}>
        <div className="bar-inner">
          <TabLinks tabs={ADMIN_TABS} path={path} />
        </div>
      </nav>
    </div>
  );
}
