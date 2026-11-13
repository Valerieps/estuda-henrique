import { useEffect, useState, type FormEvent } from 'react';
import type { ApiError } from '../../application/api-contract';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button, ButtonLink } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { navigate } from '../router';

const ERRORS: Record<string, string> = {
  'sem-convite': strings.signIn.noInvite,
  login: strings.signIn.failed,
};

// The test sign-in (ADR-007) is offered only where the server may accept it: this computer.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

function DevSignIn() {
  const { backend } = useServices();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.devSignIn(email, name);
    if (result.ok) {
      window.location.assign('/');
      return;
    }
    const errors: Partial<Record<ApiError, string>> = {
      forbidden: strings.signIn.noInvite,
      not_found: strings.signIn.devOff,
      invalid: strings.invites.invalidEmail,
    };
    setError(errors[result.error] ?? strings.genericError);
  }

  return (
    <form className="stack dev-sign-in" onSubmit={submit}>
      <h2>{strings.signIn.devTitle}</h2>
      <Field
        label={strings.signIn.devEmail}
        type="email"
        required
        autoComplete="off"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field label={strings.signIn.devName} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" variant="secondary">
        {strings.signIn.devButton}
      </Button>
      <p className="muted small">{strings.signIn.devHint}</p>
    </form>
  );
}

export function SignIn() {
  const { backend } = useServices();
  const [error] = useState(() => ERRORS[new URLSearchParams(window.location.search).get('erro') ?? ''] ?? null);

  // The error code came from the sign-in redirect; drop it from the address bar.
  useEffect(() => {
    if (window.location.search) navigate(window.location.pathname, { replace: true });
  }, []);

  return (
    <main className="app stack">
      <h1>{strings.appName}</h1>
      <p>{strings.signIn.tagline}</p>
      {error && <Notice tone="error">{error}</Notice>}
      <ButtonLink href={backend.signInUrl}>{strings.signIn.button}</ButtonLink>
      {LOCAL_HOSTS.includes(window.location.hostname) && <DevSignIn />}
    </main>
  );
}
