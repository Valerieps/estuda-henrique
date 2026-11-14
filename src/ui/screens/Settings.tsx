import { useEffect, useState } from 'react';
import type { SettingsView } from '../../application/api-contract';
import { strings } from '../../domain/strings';
import { MAX_NEW_PER_DAY, MAX_ROUTINE_LENGTH, MIN_NEW_PER_DAY } from '../../domain/study/settings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { useQuery } from '../use-query';

const s = strings.settings;

export function Settings({ onSignOut }: { onSignOut: () => void }) {
  const settings = useQuery('settings', {}, ['settings']);
  const { backend } = useServices();
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(change: Partial<SettingsView>, done: string): Promise<boolean> {
    setBusy(true);
    const result = await backend.command('settings.update', change);
    setBusy(false);
    setMessage(result.ok ? { tone: 'info', text: done } : { tone: 'error', text: s.saveFailed });
    if (result.ok) settings.reload();
    return result.ok;
  }

  if (!settings.data) {
    return (
      <section className="stack">
        <h1>{s.title}</h1>
        {settings.error ? (
          <>
            <Notice tone="error">{strings.genericError}</Notice>
            <Button onClick={settings.reload}>{strings.retry}</Button>
          </>
        ) : (
          <p className="muted" role="status">
            {s.loading}
          </p>
        )}
      </section>
    );
  }
  const data = settings.data;
  return (
    <section className="stack">
      <h1>{s.title}</h1>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <NewPerDay busy={busy} current={data.newPerDay} save={(n) => save({ newPerDay: n }, `${s.saved} ${s.newPerDayWarning}`)} />
      <RestDays busy={busy} current={data.restDays} save={(days) => save({ restDays: days }, s.saved)} />
      <Routine busy={busy} when={data.routineWhen} where={data.routineWhere} save={(change) => save(change, s.saved)} />
      <h2>{s.about}</h2>
      <p className="muted small">{s.aboutText}</p>
      <Button variant="secondary" onClick={onSignOut}>
        {strings.nav.signOut}
      </Button>
    </section>
  );
}

function NewPerDay({ busy, current, save }: { busy: boolean; current: number; save: (n: number) => Promise<boolean> }) {
  const [text, setText] = useState(String(current));
  useEffect(() => setText(String(current)), [current]);
  const value = Number(text);
  const valid = text.trim() !== '' && Number.isInteger(value) && value >= MIN_NEW_PER_DAY && value <= MAX_NEW_PER_DAY;
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && value !== current) void save(value);
      }}
    >
      <Field
        label={s.newPerDay}
        type="number"
        inputMode="numeric"
        min={MIN_NEW_PER_DAY}
        max={MAX_NEW_PER_DAY}
        value={text}
        onChange={(event) => setText(event.target.value)}
        error={valid ? null : s.newPerDayInvalid}
      />
      <Button type="submit" variant="secondary" disabled={busy || !valid || value === current}>
        {s.save}
      </Button>
    </form>
  );
}

function RestDays({ busy, current, save }: { busy: boolean; current: readonly number[]; save: (days: number[]) => Promise<boolean> }) {
  return (
    <div className="stack">
      <h2>{s.restDays}</h2>
      <div className="day-toggles">
        {s.weekdays.map((name, day) => {
          const on = current.includes(day);
          return (
            <Button key={name} variant="secondary" aria-pressed={on} disabled={busy} onClick={() => void save(on ? current.filter((d) => d !== day) : [...current, day])}>
              {name}
            </Button>
          );
        })}
      </div>
      <p className="muted small">{s.restDaysHelp}</p>
    </div>
  );
}

function Routine({ busy, when, where, save }: { busy: boolean; when: string | null; where: string | null; save: (change: Partial<SettingsView>) => Promise<boolean> }) {
  const [whenText, setWhen] = useState(when ?? '');
  const [whereText, setWhere] = useState(where ?? '');
  useEffect(() => setWhen(when ?? ''), [when]);
  useEffect(() => setWhere(where ?? ''), [where]);
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        void save({ routineWhen: whenText.trim() || null, routineWhere: whereText.trim() || null });
      }}
    >
      <h2>{s.routine}</h2>
      <Field label={s.routineWhen} placeholder={s.routineWhenHint} maxLength={MAX_ROUTINE_LENGTH} value={whenText} onChange={(event) => setWhen(event.target.value)} />
      <Field label={s.routineWhere} placeholder={s.routineWhereHint} maxLength={MAX_ROUTINE_LENGTH} value={whereText} onChange={(event) => setWhere(event.target.value)} />
      <Button type="submit" variant="secondary" disabled={busy}>
        {s.save}
      </Button>
    </form>
  );
}
