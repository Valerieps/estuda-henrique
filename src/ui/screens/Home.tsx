import { useState, type FormEvent } from 'react';
import type { MeView } from '../../application/api-contract';
import { greetingFor } from '../../domain/greeting';
import { NAME_MAX_LENGTH } from '../../domain/group/profile';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';

// Placeholder screen: a greeting and the member's name. Replace it with the app's first screen.
export function Home({ me }: { me: MeView }) {
  const { backend } = useServices();
  const [name, setName] = useState(me.name);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('member.rename', { name });
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <section>
      <h1>{strings.home.greeting(greetingFor(new Date()), me.name)}</h1>
      <form className="row end" onSubmit={submit}>
        <Field
          className="grow"
          label={strings.home.nameLabel}
          required
          maxLength={NAME_MAX_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit">{strings.home.save}</Button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
    </section>
  );
}
