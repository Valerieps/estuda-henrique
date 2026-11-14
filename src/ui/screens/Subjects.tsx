import { useState } from 'react';
import { strings } from '../../domain/strings';
import { arrangeTopics, countByState, type TopicOrder, type TopicStateFilter } from '../../domain/topic-list';
import { topicState, type TopicState } from '../../domain/topic-state';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { EmptyState } from '../components/EmptyState';
import { MasteryHelp } from '../components/MasteryHelp';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { StateBadge } from '../components/StateBadge';
import { Tile } from '../components/Tile';
import { useQuery } from '../use-query';
import './Subjects.css';

const s = strings.subjects;

/** The filter chips, worst state first; a state with no topic gets no chip. */
const STATE_FILTERS: readonly TopicState[] = ['weak', 'progress', 'new', 'mastered'];

/**
 * The Matérias tab. With one subject it opens straight on its topics; from the second on, each
 * subject gets its own heading (docs/spec/cartas.md). Topics are a two-column grid of tiles, each
 * with its state and coverage (docs/spec/diagnostico.md); chips filter them by state and put the
 * weakest first.
 */
export function Subjects() {
  const subjects = useQuery('subjects', {}, ['subjects']);
  const thermometer = useQuery('thermometer', {}, ['study', 'cards', 'subjects']);
  const [filter, setFilter] = useState<TopicStateFilter>('all');
  const [order, setOrder] = useState<TopicOrder>('course');
  if (!subjects.data || !thermometer.data) {
    if (subjects.error || thermometer.error) {
      return (
        <section className="stack">
          <h1>{s.title}</h1>
          <Notice tone="error">{strings.genericError}</Notice>
          <Button
            onClick={() => {
              subjects.reload();
              thermometer.reload();
            }}
          >
            {strings.retry}
          </Button>
        </section>
      );
    }
    return (
      <section>
        <h1>{s.title}</h1>
        <p className="muted" role="status">{s.loading}</p>
      </section>
    );
  }
  if (subjects.data.length === 0) return <EmptyState title={s.title} text={s.empty} />;
  const byTopic = new Map(thermometer.data.topics.map((t) => [t.id, t]));
  const single = subjects.data.length === 1;
  const withStats = subjects.data.map((subject) => ({
    subject,
    topics: subject.topics.map((topic) => {
      const stats = byTopic.get(topic.id);
      const seen = stats?.seen ?? 0;
      const mastery = stats?.mastery ?? null;
      return { topic, stats, seen, mastery, state: topicState(mastery, seen) };
    }),
  }));
  const counts = countByState(withStats.flatMap((g) => g.topics));
  const states = STATE_FILTERS.filter((state) => counts[state] > 0);
  const total = withStats.reduce((sum, g) => sum + g.topics.length, 0);
  return (
    <section className="stack">
      <h1>{single ? s.topicsOf(subjects.data[0].name) : s.title}</h1>
      <MasteryHelp />
      {total > 1 && (
        <div className="chips" role="group" aria-label={s.filters}>
          <Chip icon="worst" pressed={order === 'weakest'} onClick={() => setOrder(order === 'weakest' ? 'course' : 'weakest')}>
            {s.weakestFirst}
          </Chip>
          {states.length > 1 && (
            <>
              <Chip pressed={filter === 'all'} onClick={() => setFilter('all')}>
                {s.filterAll(total)}
              </Chip>
              {states.map((state) => (
                <Chip key={state} pressed={filter === state} onClick={() => setFilter(state)}>
                  {s.filterState[state](counts[state])}
                </Chip>
              ))}
            </>
          )}
        </div>
      )}
      {withStats.map(({ subject, topics }) => {
        const shown = arrangeTopics(topics, filter, order);
        return (
          <div key={subject.id} className="stack">
            {!single && <h2>{subject.name}</h2>}
            {topics.length === 0 && <p className="muted">{s.noTopics}</p>}
            {topics.length > 0 && shown.length === 0 && <p className="muted">{s.noMatch}</p>}
            <div className="tile-grid">
              {shown.map(({ topic, stats, seen, mastery, state }) => (
                <Tile
                  key={topic.id}
                  title={topic.name}
                  support={mastery === null ? undefined : s.mastery(mastery)}
                  tone={state}
                  to={`/topico/${encodeURIComponent(topic.id)}`}
                >
                  <StateBadge state={state} />
                  {stats ? <ProgressBar value={seen} max={stats.total} label={s.coverageLabel} tone={state} /> : null}
                </Tile>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
