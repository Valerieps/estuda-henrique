import { useMemo, useState, type FormEvent } from 'react';
import type { ApiError, NoteInput, SubjectView } from '../application/api-contract';
import { cardIndexes, type NoteKind } from '../domain/study/cloze';
import { parsePasted, replaceLine } from '../domain/study/paste';
import { strings } from '../domain/strings';
import { useServices } from './backend-context';
import { Button } from './components/Button';
import { Field, SelectField, TextAreaField } from './components/Field';
import { Notice } from './components/Notice';
import { Sheet } from './components/Sheet';
import { useQuery } from './use-query';

const LAST_TOPIC_KEY = 'estuda.lastTopic';

function readLastTopic(): string | null {
  try {
    return window.localStorage.getItem(LAST_TOPIC_KEY);
  } catch {
    return null;
  }
}

function rememberTopic(id: string) {
  try {
    window.localStorage.setItem(LAST_TOPIC_KEY, id);
  } catch {
    // A per-device convenience only; the sheet works without it.
  }
}

function errorText(error: ApiError): string {
  return error === 'forbidden' ? strings.forbidden : strings.genericError;
}

function allTopics(subjects: readonly SubjectView[]) {
  return subjects.flatMap((s) => s.topics.map((t) => ({ id: t.id, name: t.name })));
}

function topicName(subjects: readonly SubjectView[], id: string): string {
  return allTopics(subjects).find((t) => t.id === id)?.name ?? '';
}

/** The topic to start on: the last one used when it still exists, else the first. */
function initialTopic(subjects: readonly SubjectView[]): string {
  const topics = allTopics(subjects);
  const last = readLastTopic();
  return topics.find((t) => t.id === last)?.id ?? topics[0]?.id ?? '';
}

function TopicSelect({ subjects, value, onChange, label }: { subjects: readonly SubjectView[]; value: string; onChange: (id: string) => void; label: string }) {
  const grouped = subjects.length > 1;
  const options = (subject: SubjectView) =>
    subject.topics.map((t) => (
      <option key={t.id} value={t.id}>
        {t.name}
      </option>
    ));
  return (
    <SelectField label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {subjects.map((subject) =>
        grouped ? (
          <optgroup key={subject.id} label={subject.name}>
            {options(subject)}
          </optgroup>
        ) : (
          options(subject)
        ),
      )}
    </SelectField>
  );
}

type Step = 'menu' | 'card' | 'paste';

/**
 * The + sheet: it opens over the current screen and every step stays inside it, so closing or
 * saving returns to exactly where he was. `onDone` carries the "criada" notice back to the shell.
 */
export function CreateSheet({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const [step, setStep] = useState<Step>('menu');
  const subjects = useQuery('subjects', {}, ['subjects']);
  const title = step === 'card' ? strings.card.title : step === 'paste' ? strings.paste.title : strings.create.title;
  const hasTopics = subjects.data !== undefined && allTopics(subjects.data).length > 0;

  return (
    <Sheet title={title} onClose={onClose}>
      {step === 'menu' && (
        <>
          <Button onClick={() => setStep('card')}>{strings.create.newCard}</Button>
          <Button variant="secondary" onClick={() => setStep('paste')}>
            {strings.create.pasteMany}
          </Button>
        </>
      )}
      {step !== 'menu' && !subjects.data && subjects.error && <Notice tone="error">{strings.genericError}</Notice>}
      {step !== 'menu' && subjects.data && !hasTopics && <Notice>{strings.card.noTopics}</Notice>}
      {step !== 'menu' && subjects.data && hasTopics && (
        <>
          {step === 'card' ? <CardForm subjects={subjects.data} onDone={onDone} /> : <PasteForm subjects={subjects.data} onDone={onDone} />}
        </>
      )}
      {step !== 'menu' && (
        <Button variant="secondary" onClick={() => setStep('menu')}>
          {strings.create.back}
        </Button>
      )}
    </Sheet>
  );
}

function CardForm({ subjects, onDone }: { subjects: readonly SubjectView[]; onDone: (message: string) => void }) {
  const { backend } = useServices();
  const [topicId, setTopicId] = useState(() => initialTopic(subjects));
  const [kind, setKind] = useState<NoteKind>('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const gaps = kind === 'cloze' ? cardIndexes('cloze', front).length : 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (kind === 'cloze' && gaps === 0) {
      setError(strings.card.needsClozeGap);
      return;
    }
    setBusy(true);
    const note: NoteInput = { topicId, kind, front, ...(kind === 'basic' ? { back } : {}), hint: hint.trim() || null };
    const result = await backend.command('note.create', note);
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.error));
      return;
    }
    rememberTopic(topicId);
    onDone(strings.card.saved(topicName(subjects, topicId)));
  }

  return (
    <form className="stack" onSubmit={submit}>
      <TopicSelect label={strings.card.topic} subjects={subjects} value={topicId} onChange={setTopicId} />
      <SelectField label={strings.card.kind} value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
        <option value="basic">{strings.card.basic}</option>
        <option value="cloze">{strings.card.cloze}</option>
      </SelectField>
      <TextAreaField
        label={kind === 'basic' ? strings.card.front : strings.card.clozeFront}
        required
        rows={3}
        value={front}
        onChange={(e) => setFront(e.target.value)}
      />
      {kind === 'cloze' && (
        <p className="muted small" aria-live="polite">
          {gaps > 0 ? strings.card.clozeCount(gaps) : strings.card.clozeHelp}
        </p>
      )}
      {kind === 'basic' && <TextAreaField label={strings.card.back} required rows={3} value={back} onChange={(e) => setBack(e.target.value)} />}
      <Field label={strings.card.hint} value={hint} onChange={(e) => setHint(e.target.value)} />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={busy}>
        {strings.card.save}
      </Button>
    </form>
  );
}

function PasteForm({ subjects, onDone }: { subjects: readonly SubjectView[]; onDone: (message: string) => void }) {
  const { backend } = useServices();
  const [topicId, setTopicId] = useState(() => initialTopic(subjects));
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lines = useMemo(() => parsePasted(text), [text]);
  const good = lines.filter((l) => l.note);
  const bad = lines.filter((l) => !l.note);
  const cards = good.reduce((sum, l) => sum + l.cards, 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const notes: NoteInput[] = good.flatMap((l) => (l.note ? [{ topicId, ...l.note }] : []));
    const result = await backend.command('note.createMany', { notes });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result.error));
      return;
    }
    rememberTopic(topicId);
    onDone(strings.paste.saved(cards, topicName(subjects, topicId)));
  }

  return (
    <form className="stack" onSubmit={submit}>
      <TopicSelect label={strings.paste.topic} subjects={subjects} value={topicId} onChange={setTopicId} />
      <TextAreaField label={strings.paste.text} rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      <p className="muted small">{strings.paste.help}</p>
      <p role="status">{lines.length === 0 ? strings.paste.nothing : strings.paste.recognized(good.length, cards)}</p>
      {bad.length > 0 && (
        <div className="stack" role="group" aria-label={strings.paste.unrecognizedTitle(bad.length)}>
          <p className="strong">{strings.paste.unrecognizedTitle(bad.length)}</p>
          <p className="muted small">{strings.paste.unrecognizedHelp}</p>
          {bad.map((l) => (
            <Field
              key={l.index}
              label={strings.paste.fixLine(l.index + 1)}
              error={strings.paste.notRecognized}
              value={l.raw}
              onChange={(e) => setText(replaceLine(text, l.index, e.target.value))}
            />
          ))}
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={busy || cards === 0}>
        {strings.paste.save(cards)}
      </Button>
    </form>
  );
}
