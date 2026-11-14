import { useState } from 'react';
import type { WorstCardsGroup } from '../../application/api-contract';
import { strings } from '../../domain/strings';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { CardLine } from '../card-list';
import { Link, useSearch } from '../router';
import { startStudy } from '../study-launch';
import { useQuery } from '../use-query';

const s = strings.worst;

/** The Piores cartas tab: the worst cards by topic; `?topico=` keeps one topic (docs/spec/diagnostico.md). */
export function Worst() {
  const topicId = new URLSearchParams(useSearch()).get('topico') ?? undefined;
  const groups = useQuery('worstCards', topicId ? { topicId } : {}, ['study', 'cards', 'subjects']);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

  if (!groups.data) {
    return (
      <section className="stack">
        <h1>{s.title}</h1>
        {groups.error ? (
          <>
            <Notice tone="error">{strings.genericError}</Notice>
            <Button onClick={groups.reload}>{strings.retry}</Button>
          </>
        ) : (
          <p className="muted" role="status">{s.loading}</p>
        )}
      </section>
    );
  }

  const data: readonly WorstCardsGroup[] = groups.data;
  if (data.length === 0) {
    return (
      <EmptyState title={s.title} text={topicId ? s.emptyTopic : s.empty}>
        {topicId && <Link to="/piores">{s.allTopics}</Link>}
      </EmptyState>
    );
  }

  function toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

  // A card that left the list (suspended, say) is no longer picked.
  const visible = new Set(data.flatMap((g) => g.cards.map((c) => c.cardId)));
  const chosen = [...picked].filter((id) => visible.has(id));

  return (
    <section className="stack">
      <h1>{topicId ? s.onlyTopic(data[0].topicName) : s.title}</h1>
      {topicId && <Link to="/piores">{s.allTopics}</Link>}
      {data.map((group) => (
        <div key={group.topicId} className="stack">
          <div className="group-head">
            <h2 className="grow">
              <Link to={`/topico/${encodeURIComponent(group.topicId)}`} aria-label={s.openTopic(group.topicName)}>
                {group.topicName}
              </Link>
            </h2>
            <Button variant="secondary" onClick={() => startStudy({ kind: 'selected', cardIds: group.cards.map((c) => c.cardId) })}>
              {s.studyTopic(group.topicName)}
            </Button>
          </div>
          <ul className="list">
            {group.cards.map((card) => (
              <CardLine
                key={card.cardId}
                card={{ ...card, suspended: false }}
                selected={picked.has(card.cardId)}
                onSelect={() => toggle(card.cardId)}
                onChanged={groups.reload}
              />
            ))}
          </ul>
        </div>
      ))}
      {chosen.length > 0 && (
        <Button className="exam-start" onClick={() => startStudy({ kind: 'selected', cardIds: chosen })}>
          {s.studySelected(chosen.length)}
        </Button>
      )}
    </section>
  );
}
