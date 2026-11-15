import { useEffect, useState } from 'react';
import type { StudySummary as Summary, SummaryCard } from '../../application/api-contract';
import { clozeCard } from '../../domain/study/cloze';
import { strings } from '../../domain/strings';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Confetti } from '../components/Confetti';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { Tile } from '../components/Tile';
import { navigate } from '../router';
import type { StudyRequest } from '../study-launch';
import { useQuery } from '../use-query';
import './StudySummary.css';

const s = strings.summary;
/** Below this share right, Refazer erros comes first (docs/spec/estudo.md). */
const RETRY_BELOW = 0.8;
/** The size of one Mais 5?. */
const MORE_CARDS = 5;

function duration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  return minutes >= 60 ? s.hoursMinutes(Math.floor(minutes / 60), minutes % 60) : s.minutes(minutes);
}

/** The day was emptied in this session: the confetti and "Pronto por hoje". Training never empties it. */
const dayDone = (summary: Summary) => !summary.training && summary.answers > 0 && summary.remainingToday === 0;

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
  onFinish,
}: {
  sessionId: string;
  partial: boolean;
  onStart: (request: StudyRequest) => void;
  onLeave: () => void;
  /** Leaving after a session with answers (the Rotina screen may come first). */
  onFinish: () => void;
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
        <div className="summary-top">
          <h1>{partial ? s.partialTitle : s.title}</h1>
          {data.answers > 0 && (
            <span className="summary-flame">
              <Icon name="flame" />
              <span className="small">{s.streakLit}</span>
            </span>
          )}
        </div>
        {dayDone(data) && <Confetti />}
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
            <Next summary={data} onStart={onStart} onLeave={onFinish} />
          </>
        )}
      </div>
    </div>
  );
}

function Numbers({ summary }: { summary: Summary }) {
  return (
    <section className="stack" aria-label={s.title}>
      <div className="tile-grid summary-tiles">
        {!summary.training && summary.accuracy !== null && <Tile icon="target" title={percent(summary.accuracy)} support={s.accuracy} />}
        <Tile icon="book" title={String(summary.answers)} support={`${s.cardsTile} · ${s.newSeen(summary.newSeen)}`} />
        <Tile icon="sparkle" title={duration(summary.sessionSeconds)} support={`${s.timeTile} · ${s.timeToday(duration(summary.daySeconds))}`} />
        {summary.recalled > 0 && <Tile icon="check" title={String(summary.recalled)} support={s.recalledTile} />}
      </div>
      <div className="chips">
        {(['again', 'hard', 'good'] as const).map((rating) => (
          <Chip key={rating}>
            {summary.counts[rating]} {strings.study[rating]}
          </Chip>
        ))}
      </div>
      {summary.hourReached && <Notice>{s.hour}</Notice>}
    </section>
  );
}

function Moved({ summary }: { summary: Summary }) {
  if (summary.topics.length === 0) return null;
  return (
    <section className="stack">
      <h2>{s.topicsTitle}</h2>
      {summary.topics.map((topic) => (
        <TopicMove key={topic.topicId} name={topic.name} before={topic.before} after={topic.after} />
      ))}
    </section>
  );
}

/** One topic's mastery: the bar starts at where it was and grows to where it is. */
function TopicMove({ name, before, after }: { name: string; before: number | null; after: number }) {
  const [shown, setShown] = useState(before ?? 0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(after));
    return () => cancelAnimationFrame(frame);
  }, [after]);
  return (
    <div className="card summary-topic">
      <div className="summary-topic-head">
        <span className="strong">{name}</span>
        <span>
          {before === null ? s.noMastery : percent(before)} → {percent(after)}
        </span>
      </div>
      <ProgressBar value={Math.round(shown * 100)} max={100} label={s.topicProgress(name)} />
    </div>
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
        <div className="chips">
          <Chip icon="plus" onClick={() => onStart({ kind: 'review', limit: MORE_CARDS })}>
            {s.more5}
          </Chip>
        </div>
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
