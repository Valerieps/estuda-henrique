import { strings } from '../../domain/strings';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { Link } from '../router';
import { useQuery } from '../use-query';

/**
 * The Matérias tab. With one subject it opens straight on its topics; from the second on, each
 * subject gets its own heading (docs/spec/cartas.md).
 */
export function Subjects() {
  const subjects = useQuery('subjects', {}, ['subjects']);
  if (!subjects.data) {
    if (subjects.error) {
      return (
        <section className="stack">
          <h1>{strings.subjects.title}</h1>
          <Notice tone="error">{strings.genericError}</Notice>
          <Button onClick={subjects.reload}>{strings.retry}</Button>
        </section>
      );
    }
    return (
      <section>
        <h1>{strings.subjects.title}</h1>
        <p className="muted" role="status">{strings.subjects.loading}</p>
      </section>
    );
  }
  if (subjects.data.length === 0) return <EmptyState title={strings.subjects.title} text={strings.subjects.empty} />;
  const single = subjects.data.length === 1;
  return (
    <section>
      <h1>{single ? strings.subjects.topicsOf(subjects.data[0].name) : strings.subjects.title}</h1>
      {subjects.data.map((subject) => (
        <div key={subject.id}>
          {!single && <h2>{subject.name}</h2>}
          {subject.topics.length === 0 && <p className="muted">{strings.subjects.noTopics}</p>}
          <ul className="list">
            {subject.topics.map((topic) => (
              <li key={topic.id} className="card">
                <Link to={`/topico/${encodeURIComponent(topic.id)}`}>{topic.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
