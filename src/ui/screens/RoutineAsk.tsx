import { useState } from 'react';
import { strings } from '../../domain/strings';
import { MAX_ROUTINE_LENGTH } from '../../domain/study/settings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';

const s = strings.routineAsk;

/**
 * The Rotina screen: asked once, when he leaves his first Resumo (docs/spec/meta-e-ofensiva.md).
 * Both answers are optional; Pular is always there and counts as an answer.
 */
export function RoutineAsk({ onDone }: { onDone: () => void }) {
  const { backend } = useServices();
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save(change: { routineWhen?: string | null; routineWhere?: string | null }) {
    setBusy(true);
    setFailed(false);
    const result = await backend.command('settings.update', { ...change, routineAsked: true });
    setBusy(false);
    if (result.ok) onDone();
    else setFailed(true);
  }

  return (
    <div className="session-layer">
      <form
        className="screen stack"
        onSubmit={(event) => {
          event.preventDefault();
          void save({ routineWhen: when.trim() || null, routineWhere: where.trim() || null });
        }}
      >
        <h1>{s.title}</h1>
        <p className="muted">{s.intro}</p>
        {failed && <Notice tone="error">{s.failed}</Notice>}
        <Field label={strings.settings.routineWhen} placeholder={strings.settings.routineWhenHint} maxLength={MAX_ROUTINE_LENGTH} value={when} onChange={(event) => setWhen(event.target.value)} />
        <div className="chips">
          {s.whenSuggestions.map((text) => (
            <Chip key={text} pressed={when === text} onClick={() => setWhen(text)}>
              {text}
            </Chip>
          ))}
        </div>
        <Field label={strings.settings.routineWhere} placeholder={strings.settings.routineWhereHint} maxLength={MAX_ROUTINE_LENGTH} value={where} onChange={(event) => setWhere(event.target.value)} />
        <div className="chips">
          {s.whereSuggestions.map((text) => (
            <Chip key={text} pressed={where === text} onClick={() => setWhere(text)}>
              {text}
            </Chip>
          ))}
        </div>
        <Button type="submit" disabled={busy || (when.trim() === '' && where.trim() === '')}>
          {s.save}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void save({})}>
          {s.skip}
        </Button>
      </form>
    </div>
  );
}
