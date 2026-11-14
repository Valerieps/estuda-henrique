import { useState } from 'react';
import { strings } from '../../domain/strings';
import { filterTopicCards, type TopicFilter } from '../../domain/study/diagnostic';
import { Button, ButtonLink } from '../components/Button';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { CardLine, cardFront } from '../card-list';
import { openExamWithTopic } from '../exam-launch';
import { Link, navigate } from '../router';
import { useQuery } from '../use-query';

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
        <Link to="/materias">{s.back}</Link>
        {view.error === 'not_found' ? (
          <Notice>{s.notFound}</Notice>
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
  const worstPath = `/piores?topico=${encodeURIComponent(topic.topicId)}`;
  const shown = filterTopicCards(
    topic.cards.map((c) => ({ ...c, text: `${cardFront(c)} ${c.kind === 'basic' ? c.back : ''}` })),
    filter,
    search,
  );
  return (
    <section className="stack">
      <Link to="/materias">{s.back}</Link>
      <h1>{topic.topicName}</h1>
      <p className="strong">{s.mastery(topic.mastery)}</p>
      <p className="small muted">{s.coverage(topic.seen, topic.total)}</p>
      <div className="card-line-actions">
        <ButtonLink
          href={worstPath}
          variant="secondary"
          onClick={(event) => {
            event.preventDefault();
            navigate(worstPath);
          }}
        >
          {s.worstOfTopic}
        </ButtonLink>
        <Button variant="secondary" onClick={() => openExamWithTopic(topic.topicId)}>
          {s.examOfTopic}
        </Button>
      </div>
      <Field label={s.search} type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="card-line-actions" role="group" aria-label={s.filters}>
        {FILTERS.map((f) => (
          <Button key={f.id} variant="secondary" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Button>
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
