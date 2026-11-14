import { useState } from 'react';
import type { ExamCards } from '../../application/api-contract';
import type { ExamScope } from '../../domain/study/exam';
import { strings } from '../../domain/strings';
import { topicState } from '../../domain/topic-state';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { StateBadge } from '../components/StateBadge';
import { Tile } from '../components/Tile';
import { takePreselectedTopic } from '../exam-launch';
import { startStudy } from '../study-launch';
import { useQuery } from '../use-query';
import './Exam.css';

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
      <div className="chips" role="group" aria-label={s.scopeLabel}>
        <Chip icon="target" pressed={scope === 'all'} onClick={() => setScope('all')}>
          {s.scopeAll}
        </Chip>
        <Chip icon="alert" pressed={scope === 'weakest'} onClick={() => setScope('weakest')}>
          {s.scopeWeakest}
        </Chip>
      </div>
      {scope === 'weakest' && <p className="small muted">{s.scopeWeakestHint}</p>}
      <ul className="tile-grid exam-grid">
        {topics.map((topic) => {
          const pct = topic.mastery === null ? null : Math.round(topic.mastery * 100);
          const on = chosen.has(topic.id);
          return (
            <li key={topic.id} className="exam-pick" data-selected={on}>
              <label>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(topic.id)} />
                <Tile title={topic.name} support={s.cards(topic.seen, topic.total - topic.seen)}>
                  <StateBadge state={topicState(topic.mastery, topic.seen, topic.total)} />
                  <span className="small muted">{pct === null ? s.noMastery : s.mastery(pct)}</span>
                  {on && (
                    <span className="exam-check">
                      <Icon name="check" />
                      <span className="sr-only">{s.selected}</span>
                    </span>
                  )}
                </Tile>
              </label>
            </li>
          );
        })}
      </ul>
      {failure === 'error' && <Notice tone="error">{s.error}</Notice>}
      {failure === 'empty' && <Notice>{s.nothingToStudy}</Notice>}
      <div className="exam-summary">
        <p role="status" className="strong">
          {none || !total ? s.nothingChosen : s.total(total.seen, total.fresh)}
        </p>
        <Button
          onClick={() => void begin()}
          disabled={none || busy || (picked.data !== undefined && picked.data.cardIds.length === 0)}
          disabledReason={none ? s.pickOne : undefined}
        >
          {s.start}
        </Button>
      </div>
    </section>
  );
}
