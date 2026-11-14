import { useEffect, useRef, useState } from 'react';
import type { ThermometerTopic, TodayView } from '../../application/api-contract';
import { strings } from '../../domain/strings';
import { topicState } from '../../domain/topic-state';
import { useServices } from '../backend-context';
import { Button, ButtonLink } from '../components/Button';
import { Chip } from '../components/Chip';
import { Hero } from '../components/Hero';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { StateBadge } from '../components/StateBadge';
import { Tile } from '../components/Tile';
import { useInstall } from '../install-prompt';
import { navigate } from '../router';
import { startStudy } from '../study-launch';
import { FlameButton, RepairButton } from '../Streak';
import { useQuery, type QueryState } from '../use-query';
import './Today.css';

const s = strings.today;

/** What each topic's bar showed the last time Hoje was on screen, so it can animate to the new value. */
const lastShown = new Map<string, number>();

/** Whether the day was already emptied the last time Hoje looked: confetti only when it flips while he is here. */
let wasDone: boolean | null = null;

export function Today({ today }: { today: QueryState<TodayView> }) {
  const thermometer = useQuery('thermometer', {}, ['study', 'cards', 'subjects']);
  const { backend } = useServices();
  const touched = useRef(false);
  const view = today.data;
  const nothingLeft = view !== undefined && view.reviewsLeft + view.newLeft === 0;
  const reload = today.reload;

  // Opening Hoje with nothing to study counts the day for the streak.
  useEffect(() => {
    if (!nothingLeft || touched.current) return;
    touched.current = true;
    void backend.command('streak.touch', {}).then(reload);
  }, [nothingLeft, backend, reload]);

  // Confetti only when the day turned into "done" since the last time Hoje was on screen.
  const [celebrate] = useState(() => nothingLeft && wasDone === false);
  useEffect(() => {
    if (view !== undefined) wasDone = nothingLeft;
  }, [view, nothingLeft]);

  if (!view || !thermometer.data) {
    if (today.error || thermometer.error) {
      return (
        <section className="stack">
          <h1>{s.title}</h1>
          <Notice tone="error">{strings.genericError}</Notice>
          <Button
            onClick={() => {
              today.reload();
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
        <p className="muted" role="status">
          {s.loading}
        </p>
      </section>
    );
  }

  const topics = thermometer.data.topics;
  const routine = s.routine(view.routineWhen, view.routineWhere);
  return (
    <section className="today">
      {/* The tab bar already says where he is: the title is for screen readers only. */}
      <h1 className="sr-only">{s.title}</h1>
      {routine && <p className="muted small">{routine}</p>}
      <Missions view={view} hasCards={topics.some((t) => t.total > 0)} celebrate={celebrate} onReload={today.reload} />
      <WarningCard view={view} onReload={today.reload} />
      <Thermometer topics={topics} />
      <Numbers rate={thermometer.data.longTermRate} saved={thermometer.data.savedCards} />
    </section>
  );
}

/** The hero (Missões de hoje), Estudar and the chips; once the day is emptied, "Missões cumpridas" and what is worth doing next. */
function Missions({ view, hasCards, celebrate, onReload }: { view: TodayView; hasCards: boolean; celebrate: boolean; onReload: () => void }) {
  const left = view.reviewsLeft + view.newLeft;
  const reviewsTotal = view.reviewsDone + view.reviewsLeft;
  const newTotal = view.newDone + view.newLeft;
  const allDone = left === 0 && hasCards;
  const title = view.restToday ? s.restDay : allDone ? s.missionsDone : s.missionsTitle;

  return (
    <div className="stack">
      <Hero>
        <div className="mission-head">
          <h2 className="hero-title grow">
            {allDone && !view.restToday && <Icon name="check" />}
            {title}
          </h2>
          <FlameButton streak={view.streak} onReload={onReload} celebrate={celebrate} className="hero-flame" />
        </div>
        {hasCards && !view.restToday && (
          <ul className="list mission-list">
            {reviewsTotal > 0 && <Mission label={s.missionReviews} barLabel={s.missionReviewsLabel} done={view.reviewsDone} total={reviewsTotal} />}
            {newTotal > 0 && <Mission label={s.missionNew(newTotal)} barLabel={s.missionNewLabel} done={view.newDone} total={newTotal} />}
          </ul>
        )}
        {allDone && !view.restToday && <p className="small">{s.doneText}</p>}
        {!hasCards && <p className="muted">{s.noCards}</p>}
        {celebrate && <Confetti />}
      </Hero>
      {left > 0 ? (
        <>
          <Button className="lg" onClick={() => startStudy({ kind: 'review' })}>
            {s.study}
          </Button>
          <div className="chips">
            <Chip icon="target" onClick={() => startStudy({ kind: 'review', limit: 5 })}>
              {s.five}
            </Chip>
            <Chip icon="worst" onClick={() => navigate('/piores')}>
              {s.worstChip}
            </Chip>
          </div>
        </>
      ) : (
        allDone && (
          <>
            <AheadNew />
            <ButtonLink
              variant="secondary"
              href="/piores"
              onClick={(event) => {
                event.preventDefault();
                navigate('/piores');
              }}
            >
              {s.worstLink}
            </ButtonLink>
          </>
        )
      )}
    </div>
  );
}

function Mission({ label, barLabel, done, total }: { label: string; barLabel: string; done: number; total: number }) {
  const complete = done >= total;
  return (
    <li className="mission" data-complete={complete}>
      <span className="mission-label">
        {complete && <Icon name="check" />}
        {label}
        {complete && <span className="sr-only"> ({s.missionComplete})</span>}
      </span>
      <ProgressBar value={done} max={total} label={barLabel} tone={complete ? 'mastered' : undefined} />
    </li>
  );
}

/** A plain burst of colored bits that fall once. The Resumo's shared confetti replaces it (note for S9). */
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

/** Adiantar mais 10 novas: a normal review session with new cards of one topic (docs/spec/estudo.md). */
function AheadNew() {
  const { data } = useQuery('studyOutlook', {}, ['study', 'cards']);
  const [chosen, setChosen] = useState<string | null>(null);
  const topicId = chosen ?? data?.suggestedTopicId ?? null;
  if (!data || data.aheadTopics.length === 0 || topicId === null) return null;
  const a = strings.summary;
  return (
    <>
      <label className="field">
        <span className="field-label">{a.aheadTopic}</span>
        <select value={topicId} onChange={(event) => setChosen(event.target.value)}>
          {data.aheadTopics.map((t) => (
            <option key={t.topicId} value={t.topicId}>
              {a.aheadTopicOption(t.name, t.seen, t.total)}
            </option>
          ))}
        </select>
      </label>
      <Button onClick={() => startStudy({ kind: 'review', aheadTopicId: topicId })}>{a.ahead}</Button>
    </>
  );
}

/** One warning at a time, in this order: a streak he can fix, then installing the app. */
function WarningCard({ view, onReload }: { view: TodayView; onReload: () => void }) {
  const { canInstall, install } = useInstall();
  if (view.streak.canRepair) {
    return (
      <div className="card stack">
        <p>{strings.streak.repairText}</p>
        <RepairButton onDone={onReload} />
      </div>
    );
  }
  if (view.hasStudied && canInstall) {
    return (
      <div className="card stack">
        <p>{strings.notice.install}</p>
        <Button variant="secondary" onClick={install}>
          {strings.notice.installButton}
        </Button>
      </div>
    );
  }
  return null;
}

function Thermometer({ topics }: { topics: readonly ThermometerTopic[] }) {
  return (
    <div className="stack">
      <h2>{strings.thermometer.title}</h2>
      {topics.length === 0 && <p className="muted small">{strings.thermometer.empty}</p>}
      <div className="tile-grid">
        {topics.map((topic) => (
          <TopicTile key={topic.id} topic={topic} />
        ))}
      </div>
    </div>
  );
}

function TopicTile({ topic }: { topic: ThermometerTopic }) {
  const state = topicState(topic.mastery, topic.seen);
  const target = Math.round((topic.mastery ?? 0) * 100);
  const [shown, setShown] = useState(lastShown.get(topic.id) ?? target);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(target));
    lastShown.set(topic.id, target);
    return () => cancelAnimationFrame(frame);
  }, [target, topic.id]);

  return (
    <Tile
      to={`/piores?topico=${encodeURIComponent(topic.id)}`}
      tone={state}
      title={topic.name}
      support={strings.thermometer.coverage(topic.seen, topic.total)}
    >
      <StateBadge state={state} />
      <div className="topic-row">
        <span className="topic-value">{strings.thermometer.mastery(topic.mastery)}</span>
        <Spark topic={topic} />
      </div>
      <div className="topic-bar" data-state={state} aria-hidden="true">
        <div className="topic-bar-fill" style={{ width: `${shown}%` }} />
      </div>
    </Tile>
  );
}

/** Memória de longo prazo and cartas guardadas: they wait for data, and a line says so. */
function Numbers({ rate, saved }: { rate: number | null; saved: number }) {
  if (rate === null && saved === 0) return <p className="muted small">{s.numbersPending}</p>;
  return (
    <div className="tile-grid">
      <Tile title={s.longTermValue(rate)} support={s.longTermLabel}>
        <span className="muted small">{s.longTermHint(rate)}</span>
      </Tile>
      <Tile title={String(saved)} support={s.savedLabel} />
    </div>
  );
}

/** The minilinha: the topic's mastery over the last 4 weeks. Nothing before it has two points. */
function Spark({ topic }: { topic: ThermometerTopic }) {
  if (topic.trend.length < 2) return null;
  const points = topic.trend.map((p, i) => `${(i / (topic.trend.length - 1)) * 100},${100 - p.mastery * 100}`).join(' ');
  return (
    <svg className="spark" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={strings.thermometer.trendLabel(topic.name)}>
      <polyline points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
