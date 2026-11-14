import { useEffect, useRef, useState } from 'react';
import type { ThermometerTopic, TodayView } from '../../application/api-contract';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button, ButtonLink } from '../components/Button';
import { Notice } from '../components/Notice';
import { useInstall } from '../install-prompt';
import { Link, navigate } from '../router';
import { startStudy } from '../study-launch';
import { RepairButton } from '../Streak';
import { useQuery, type QueryState } from '../use-query';

const s = strings.today;

/** What each topic's bar showed the last time Hoje was on screen, so it can animate to the new value. */
const lastShown = new Map<string, number>();

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
    <section className="stack">
      <h1>{s.title}</h1>
      {routine && <p className="muted small">{routine}</p>}
      <p className="small">{s.longTerm(thermometer.data.longTermRate, thermometer.data.savedCards)}</p>
      <Goal view={view} hasCards={topics.some((t) => t.total > 0)} />
      <WarningCard view={view} onReload={today.reload} />
      <Thermometer topics={topics} />
    </section>
  );
}

function Goal({ view, hasCards }: { view: TodayView; hasCards: boolean }) {
  const left = view.reviewsLeft + view.newLeft;

  if (left === 0) {
    return (
      <div className="stack">
        {view.restToday && <p className="strong">{s.restDay}</p>}
        {hasCards ? (
          <>
            <h2>{s.done}</h2>
            <p>{s.doneText}</p>
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
        ) : (
          <p className="muted">{s.noCards}</p>
        )}
      </div>
    );
  }
  return (
    <div className="stack">
      {view.restToday ? <p className="strong">{s.restDay}</p> : <p className="strong">{s.goal(view.reviewsLeft, view.newLeft)}</p>}
      <Button onClick={() => startStudy({ kind: 'review' })}>{s.study}</Button>
      <Button variant="secondary" onClick={() => startStudy({ kind: 'review', limit: 5 })}>
        {s.five}
      </Button>
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
      {topics.length === 0 && <p className="muted">{strings.thermometer.empty}</p>}
      <div className="thermo">
        {topics.map((topic) => (
          <TopicRow key={topic.id} topic={topic} />
        ))}
      </div>
    </div>
  );
}

function TopicRow({ topic }: { topic: ThermometerTopic }) {
  const target = Math.round((topic.mastery ?? 0) * 100);
  const [shown, setShown] = useState(lastShown.get(topic.id) ?? target);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(target));
    lastShown.set(topic.id, target);
    return () => cancelAnimationFrame(frame);
  }, [target, topic.id]);

  return (
    <Link
      to={`/piores?topico=${encodeURIComponent(topic.id)}`}
      className={topic.weak ? 'thermo-row weak' : 'thermo-row'}
      aria-label={strings.thermometer.open(topic.name)}
    >
      <div className="head">
        <span className="strong grow">{topic.name}</span>
        <span className="value">{strings.thermometer.mastery(topic.mastery)}</span>
      </div>
      <div className="progress" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${shown}%` }} />
      </div>
      <div className="foot">
        <span className="muted small grow">
          {strings.thermometer.coverage(topic.seen, topic.total)}
          {topic.weak && ` · ${strings.thermometer.weak}`}
        </span>
        <Spark topic={topic} />
      </div>
    </Link>
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
