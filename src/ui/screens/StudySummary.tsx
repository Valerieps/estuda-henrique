import { useState } from 'react';
import type { StudySummary as Summary, SummaryCard } from '../../application/api-contract';
import { clozeCard } from '../../domain/study/cloze';
import { strings } from '../../domain/strings';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { navigate } from '../router';
import type { StudyRequest } from '../study-launch';
import { useQuery } from '../use-query';

const s = strings.summary;
/** Below this share right, Refazer erros comes first (docs/spec/estudo.md). */
const RETRY_BELOW = 0.8;
/** The size of one Mais 5?. */
const MORE_CARDS = 5;

function duration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  return minutes >= 60 ? s.hoursMinutes(Math.floor(minutes / 60), minutes % 60) : s.minutes(minutes);
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** The front of a card the way the list shows it: a cloze keeps its blank. */
function cardText(card: SummaryCard): string {
  if (card.kind === 'basic') return card.front;
  const cloze = clozeCard(card.front, card.clozeIndex);
  return cloze ? `${cloze.before}${strings.study.blank}${cloze.after}` : card.front;
}

/**
 * The Resumo: where every session ends, also when he leaves in the middle (`partial`). From it he
 * can go on (Mais 5?, Refazer erros, Adiantar novas) or go back to where he came from.
 */
export function StudySummary({
  sessionId,
  partial,
  onStart,
  onLeave,
}: {
  sessionId: string;
  partial: boolean;
  onStart: (request: StudyRequest) => void;
  onLeave: () => void;
}) {
  const { data, error } = useQuery('studySummary', { sessionId }, ['study']);

  if (!data) {
    return (
      <div className="session-layer">
        <div className="screen">
          <h1>{s.title}</h1>
          {error ? (
            <Notice tone="error">{s.failed}</Notice>
          ) : (
            <p className="muted" role="status">
              {s.loading}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="session-layer">
      <div className="screen stack">
        <h1>{partial ? s.partialTitle : s.title}</h1>
        {data.training && <Notice>{strings.study.training}</Notice>}
        {data.answers === 0 ? (
          <>
            <p className="muted">{s.noAnswers}</p>
            <Button onClick={onLeave}>{s.back}</Button>
          </>
        ) : (
          <>
            <Numbers summary={data} />
            <Moved summary={data} />
            <Wrong cards={data.wrong} />
            <Next summary={data} onStart={onStart} onLeave={onLeave} />
          </>
        )}
      </div>
    </div>
  );
}

function Numbers({ summary }: { summary: Summary }) {
  return (
    <section className="stack" aria-label={s.title}>
      {summary.recalled > 0 && <Notice>{s.recalled(summary.recalled)}</Notice>}
      {!summary.training && summary.accuracy !== null && (
        <p>
          <span className="muted">{s.accuracy}</span>
          <br />
          <span className="summary-figure">{percent(summary.accuracy)}</span>
        </p>
      )}
      <div className="answers" role="list">
        {(['again', 'hard', 'good'] as const).map((rating) => (
          <div key={rating} className="card" role="listitem">
            <span className="summary-figure">{summary.counts[rating]}</span>
            <br />
            <span className="muted small">{strings.study[rating]}</span>
          </div>
        ))}
      </div>
      <p className="muted small">
        {s.answers(summary.answers)} · {s.newSeen(summary.newSeen)}
      </p>
      <p className="muted small">{s.time(duration(summary.sessionSeconds), duration(summary.daySeconds))}</p>
      {summary.hourReached && <Notice>{s.hour}</Notice>}
    </section>
  );
}

function Moved({ summary }: { summary: Summary }) {
  if (summary.topics.length === 0) return null;
  return (
    <section>
      <h2>{s.topicsTitle}</h2>
      <ul className="list">
        {summary.topics.map((topic) => (
          <li key={topic.topicId} className="card">
            <span className="strong">{topic.name}</span>{' '}
            <span>
              {topic.before === null ? s.noMastery : percent(topic.before)} → {percent(topic.after)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Wrong({ cards }: { cards: readonly SummaryCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section>
      <h2>{s.wrongTitle}</h2>
      <ul className="list">
        {cards.map((card) => (
          <li key={card.cardId} className="card">
            <p>{cardText(card)}</p>
            <p className="muted small">{card.kind === 'basic' ? card.back : card.topicName}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What comes next: Refazer erros under 80%, Mais 5? while the day has cards, then "Pronto por hoje". */
function Next({ summary, onStart, onLeave }: { summary: Summary; onStart: (request: StudyRequest) => void; onLeave: () => void }) {
  const retry = !summary.training && summary.accuracy !== null && summary.accuracy < RETRY_BELOW && summary.retryCardIds.length > 0;
  const more = summary.remainingToday > 0;
  return (
    <section className="stack">
      {retry && (
        <div className="stack">
          <p className="muted">{s.retryText}</p>
          <Button onClick={() => onStart({ kind: 'retry', cardIds: summary.retryCardIds })}>{s.retry}</Button>
        </div>
      )}
      {more ? (
        <Button variant={retry ? 'secondary' : 'primary'} onClick={() => onStart({ kind: 'review', limit: MORE_CARDS })}>
          {s.more5}
        </Button>
      ) : (
        <DoneForToday summary={summary} onStart={onStart} />
      )}
      <Button variant="secondary" onClick={onLeave}>
        {s.back}
      </Button>
    </section>
  );
}

function DoneForToday({ summary, onStart }: { summary: Summary; onStart: (request: StudyRequest) => void }) {
  const { data } = useQuery('studyOutlook', {}, ['study', 'cards']);
  const [chosen, setChosen] = useState<string | null>(null);
  const topicId = chosen ?? data?.suggestedTopicId ?? null;
  return (
    <div className="stack">
      <h2>{s.doneForToday}</h2>
      <p>{s.doneForTodayText}</p>
      {summary.longTermRate !== null && <p className="muted">{s.longTerm(Math.round(summary.longTermRate * 100))}</p>}
      {data && data.aheadTopics.length > 0 && topicId !== null && (
        <>
          <label className="field">
            <span className="field-label">{s.aheadTopic}</span>
            <select value={topicId} onChange={(e) => setChosen(e.target.value)}>
              {data.aheadTopics.map((t) => (
                <option key={t.topicId} value={t.topicId}>
                  {s.aheadTopicOption(t.name, t.seen, t.total)}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={() => onStart({ kind: 'review', aheadTopicId: topicId })}>{s.ahead}</Button>
        </>
      )}
      <Button variant="secondary" onClick={() => navigate('/piores')}>
        {s.worst}
      </Button>
    </div>
  );
}
