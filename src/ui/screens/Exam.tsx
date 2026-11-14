import { useState } from 'react';
import type { ExamCards } from '../../application/api-contract';
import type { ExamScope } from '../../domain/study/exam';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { takePreselectedTopic } from '../exam-launch';
import { startStudy } from '../study-launch';
import { useQuery } from '../use-query';

const s = strings.exam;

/** Fisher-Yates: the Véspera shows the cards shuffled, ignoring the schedule. */
function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The Prova tab: pick the topics of the exam and start a Véspera, a training session (docs/spec/vespera.md). */
export function Exam() {
  const { backend } = useServices();
  const thermometer = useQuery('thermometer', {}, ['study', 'cards', 'subjects']);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => {
    const first = takePreselectedTopic();
    return new Set(first ? [first] : []);
  });
  const [scope, setScope] = useState<ExamScope>('all');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<'error' | 'empty' | null>(null);

  const topicIds = [...chosen];
  const totals = useQuery('examCards', { topicIds, scope: 'all' }, ['study', 'cards']);
  const picked = useQuery('examCards', { topicIds, scope }, ['study', 'cards']);

  if (!thermometer.data) {
    return (
      <section className="stack">
        <h1>{s.title}</h1>
        {thermometer.error ? (
          <>
            <Notice tone="error">{strings.genericError}</Notice>
            <Button onClick={thermometer.reload}>{strings.retry}</Button>
          </>
        ) : (
          <p className="muted" role="status">{s.loading}</p>
        )}
      </section>
    );
  }
  const topics = thermometer.data.topics;
  if (topics.length === 0) return <EmptyState {...s.empty} />;

  function toggle(id: string) {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChosen(next);
    setFailure(null);
  }

  async function begin() {
    setBusy(true);
    setFailure(null);
    const result = await backend.query('examCards', { topicIds, scope });
    setBusy(false);
    if (!result.ok) return setFailure('error');
    const cards: ExamCards = result.value;
    if (cards.cardIds.length === 0) return setFailure('empty');
    startStudy({ kind: 'cram', cardIds: shuffled(cards.cardIds) });
  }

  const total = totals.data;
  const none = chosen.size === 0;
  return (
    <section className="stack">
      <h1>{s.title}</h1>
      <p className="muted">{s.training}</p>
      <h2>{s.topics}</h2>
      <ul className="list">
        {topics.map((topic) => {
          const pct = topic.mastery === null ? null : Math.round(topic.mastery * 100);
          return (
            <li key={topic.id} className="card">
              <label className="exam-topic">
                <input type="checkbox" checked={chosen.has(topic.id)} onChange={() => toggle(topic.id)} />
                <span className="grow stack">
                  <span className="strong">{topic.name}</span>
                  <span className="progress" role="img" aria-label={pct === null ? s.noMastery : s.mastery(pct)}>
                    <span className="progress-fill" style={{ width: `${pct ?? 0}%` }} />
                  </span>
                  <span className="small muted">
                    {pct === null ? s.noMastery : s.mastery(pct)} · {s.cards(topic.seen, topic.total - topic.seen)}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p role="status" className="strong">
        {none || !total ? s.nothingChosen : s.total(total.seen, total.fresh)}
      </p>
      <fieldset className="exam-scope">
        <legend className="field-label">{s.scopeLabel}</legend>
        <label>
          <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} />
          {s.scopeAll}
        </label>
        <label>
          <input type="radio" name="scope" checked={scope === 'weakest'} onChange={() => setScope('weakest')} />
          <span>
            {s.scopeWeakest} <span className="small muted">{s.scopeWeakestHint}</span>
          </span>
        </label>
      </fieldset>
      {failure === 'error' && <Notice tone="error">{s.error}</Notice>}
      {failure === 'empty' && <Notice>{s.nothingToStudy}</Notice>}
      <Button className="exam-start" onClick={() => void begin()} disabled={none || busy || (picked.data !== undefined && picked.data.cardIds.length === 0)}>
        {s.start}
      </Button>
    </section>
  );
}
