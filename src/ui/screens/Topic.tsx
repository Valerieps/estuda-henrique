import { useState } from 'react';
import { strings } from '../../domain/strings';
import { filterTopicCards, type TopicFilter } from '../../domain/study/diagnostic';
import { topicState } from '../../domain/topic-state';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { Field } from '../components/Field';
import { BackLink } from '../components/BackLink';
import { Hero } from '../components/Hero';
import { MasteryHelp } from '../components/MasteryHelp';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { StateBadge, stateIcon } from '../components/StateBadge';
import { CardLine, cardFront } from '../card-list';
import { openExamWithTopic } from '../exam-launch';
import { Link, navigate } from '../router';
import { useQuery } from '../use-query';
import './Topic.css';

const s = strings.topic;

const FILTERS: readonly { id: TopicFilter; label: string }[] = [
  { id: 'all', label: s.filterAll },
  { id: 'new', label: s.filterNew },
  { id: 'suspended', label: s.filterSuspended },
  { id: 'problem', label: s.filterProblem },
];

/** The Tópico screen: mastery, coverage, the shortcuts, search, filters and the cards (docs/spec/diagnostico.md). */
export function Topic({ topicId }: { topicId: string }) {
  const view = useQuery('topicCards', { topicId }, ['study', 'cards', 'subjects']);
  const [filter, setFilter] = useState<TopicFilter>('all');
  const [search, setSearch] = useState('');

  if (!view.data) {
    return (
      <section className="stack">
        <BackLink to="/materias">{s.back}</BackLink>
        {view.error === 'not_found' ? (
          <EmptyState title={s.back} text={s.notFound}>
            <Link to="/materias">{s.backToSubjects}</Link>
          </EmptyState>
        ) : view.error ? (
          <>
            <Notice tone="error">{strings.genericError}</Notice>
            <Button onClick={view.reload}>{strings.retry}</Button>
          </>
        ) : (
          <p className="muted" role="status">{s.loading}</p>
        )}
      </section>
    );
  }

  const topic = view.data;
  const state = topicState(topic.mastery, topic.seen);
  const worstPath = `/piores?topico=${encodeURIComponent(topic.topicId)}`;
  const shown = filterTopicCards(
    topic.cards.map((c) => ({ ...c, text: `${cardFront(c)} ${c.kind === 'basic' ? c.back : ''}` })),
    filter,
    search,
  );
  return (
    <section className="stack">
      <BackLink to="/materias">{s.back}</BackLink>
      <Hero icon={stateIcon(state)} title={topic.topicName} tone={state}>
        <div className="topic-hero-stats">
          <span className="topic-mastery">{s.mastery(topic.mastery)}</span>
          <StateBadge state={state} />
        </div>
        <ProgressBar value={topic.seen} max={topic.total} label={s.coverageLabel} tone={state} />
        <MasteryHelp />
      </Hero>
      <div className="chips">
        <Chip icon="worst" onClick={() => navigate(worstPath)}>
          {s.worstOfTopic}
        </Chip>
        <Chip icon="exam" onClick={() => openExamWithTopic(topic.topicId)}>
          {s.examOfTopic}
        </Chip>
      </div>
      <Field label={s.search} type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="chips" role="group" aria-label={s.filters}>
        {FILTERS.map((f) => (
          <Chip key={f.id} pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>
      {topic.cards.length === 0 ? (
        <p className="muted">{s.noCards}</p>
      ) : shown.length === 0 ? (
        <p className="muted">{s.noMatch}</p>
      ) : (
        <ul className="list">
          {shown.map((card) => (
            <CardLine key={card.cardId} card={card} onChanged={view.reload} />
          ))}
        </ul>
      )}
    </section>
  );
}
