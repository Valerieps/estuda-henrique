import { strings } from '../../domain/strings';
import { topicState } from '../../domain/topic-state';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { StateBadge } from '../components/StateBadge';
import { Tile } from '../components/Tile';
import { useQuery } from '../use-query';
import './Subjects.css';

const s = strings.subjects;

/**
 * The Matérias tab. With one subject it opens straight on its topics; from the second on, each
 * subject gets its own heading (docs/spec/cartas.md). Topics are a two-column grid of tiles, each
 * with its state and coverage (docs/spec/diagnostico.md).
 */
export function Subjects() {
  const subjects = useQuery('subjects', {}, ['subjects']);
  const thermometer = useQuery('thermometer', {}, ['study', 'cards', 'subjects']);
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
  return (
    <section className="stack">
      <h1>{single ? s.topicsOf(subjects.data[0].name) : s.title}</h1>
      {subjects.data.map((subject) => (
        <div key={subject.id} className="stack">
          {!single && <h2>{subject.name}</h2>}
          {subject.topics.length === 0 && <p className="muted">{s.noTopics}</p>}
          <div className="tile-grid">
            {subject.topics.map((topic) => {
              const stats = byTopic.get(topic.id);
              const seen = stats?.seen ?? 0;
              const state = topicState(stats?.mastery ?? null, seen);
              return (
                <Tile
                  key={topic.id}
                  title={topic.name}
                  support={stats ? `${s.mastery(stats.mastery)} · ${s.coverage(seen, stats.total)}` : undefined}
                  tone={state}
                  to={`/topico/${encodeURIComponent(topic.id)}`}
                >
                  <StateBadge state={state} />
                </Tile>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
