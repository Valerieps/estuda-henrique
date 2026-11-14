import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { StudyCard, StudySessionView } from '../../application/api-contract';
import { cardIndexes, clozeCard } from '../../domain/study/cloze';
import { intervalParts } from '../../domain/study/interval-label';
import { afterAnswer, returnDelays } from '../../domain/study/review-queue';
import type { Answer } from '../../domain/study/scheduler';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { Sheet } from '../components/Sheet';
import { navigate } from '../router';
import { clearStudyRequest, currentStudyRequest, type StudyRequest } from '../study-launch';
import { StudySummary } from './StudySummary';

const s = strings.study;
/** The short buzz on each answer button, in ms. */
const HAPTIC_MS = 10;
/** How long "Volta já já" stays after Errei, in ms. */
const SOON_MS = 2000;

function vibrate() {
  try {
    navigator.vibrate?.(HAPTIC_MS);
  } catch {
    // No vibration on this device.
  }
}

function whenLabel(ms: number): string {
  const { unit, amount } = intervalParts(ms);
  const text = { minute: s.minutes, hour: s.hours, day: s.days, month: s.months }[unit](amount);
  return s.returnsIn(text);
}

type Phase = { name: 'loading' } | { name: 'empty' } | { name: 'error' } | { name: 'running'; session: StudySessionView } | { name: 'summary'; sessionId: string; partial: boolean };

/**
 * The session layer: full screen, over the app, without its bars (docs/spec/estudo.md). It opens
 * the session the last `startStudy` asked for (the day's review when nobody did), then runs it.
 */
export function Study() {
  const { backend } = useServices();
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const started = useRef(false);

  function begin(request: StudyRequest) {
    setPhase({ name: 'loading' });
    void backend
      .command('study.start', {
        kind: request.kind,
        limit: request.limit,
        aheadTopicId: request.aheadTopicId,
        cardIds: request.cardIds ? [...request.cardIds] : undefined,
      })
      .then((result) => {
        if (!result.ok) setPhase({ name: 'error' });
        else setPhase(result.value ? { name: 'running', session: result.value } : { name: 'empty' });
      });
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    begin(currentStudyRequest());
  }, [backend]);

  function leave() {
    clearStudyRequest();
    navigate('/');
  }

  if (phase.name === 'running') {
    return (
      <Session
        key={phase.session.sessionId}
        session={phase.session}
        onFinish={(partial) => setPhase({ name: 'summary', sessionId: phase.session.sessionId, partial })}
        onLeave={leave}
      />
    );
  }

  if (phase.name === 'summary') {
    return <StudySummary key={phase.sessionId} sessionId={phase.sessionId} partial={phase.partial} onStart={begin} onLeave={leave} />;
  }

  return (
    <Layer>
      {phase.name === 'loading' && (
        <p className="muted" role="status">
          {s.loading}
        </p>
      )}
      {phase.name === 'error' && (
        <EmptyState title={strings.empty.study.title} text={s.startFailed}>
          <Button variant="secondary" onClick={leave}>
            {s.back}
          </Button>
        </EmptyState>
      )}
      {phase.name === 'empty' && (
        <EmptyState title={strings.empty.study.title} text={strings.empty.study.text}>
          <Button variant="secondary" onClick={leave}>
            {s.back}
          </Button>
        </EmptyState>
      )}
    </Layer>
  );
}

function Layer({ header, children }: { header?: ReactNode; children: ReactNode }) {
  return (
    <div className="session-layer">
      {header && <header>{header}</header>}
      <div className="screen">{children}</div>
    </div>
  );
}

/** The front of a card: the question, with the blank for a cloze. */
function Question({ card }: { card: StudyCard }) {
  if (card.kind === 'basic') return <p className="question">{card.front}</p>;
  const cloze = clozeCard(card.front, card.clozeIndex);
  if (!cloze) return <p className="question">{card.front}</p>;
  return (
    <p className="question">
      {cloze.before}
      <span className="blank">{s.blank}</span>
      {cloze.after}
    </p>
  );
}

/** The back of a card: the question and its answer, then the hint. */
function Answered({ card }: { card: StudyCard }) {
  const cloze = card.kind === 'cloze' ? clozeCard(card.front, card.clozeIndex) : null;
  return (
    <>
      {cloze ? (
        <p className="answer">
          {cloze.before}
          <strong className="blank">{cloze.hidden}</strong>
          {cloze.after}
        </p>
      ) : (
        <>
          <p className="question">{card.front}</p>
          <p className="answer">{card.back}</p>
        </>
      )}
      {cloze && card.back && <p className="muted">{card.back}</p>}
      {card.hint && (
        <p className="muted small">
          <span className="strong">{s.hintLabel}:</span> {card.hint}
        </p>
      )}
    </>
  );
}

function Session({ session, onFinish, onLeave }: { session: StudySessionView; onFinish: (partial: boolean) => void; onLeave: () => void }) {
  const { backend } = useServices();
  const [queue, setQueue] = useState<readonly StudyCard[]>(session.cards);
  // The queue before each answer, newest last: Desfazer goes back to the last one.
  const [history, setHistory] = useState<readonly (readonly StudyCard[])[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soon, setSoon] = useState(false);
  const [panel, setPanel] = useState<'none' | 'exit' | 'menu' | 'edit'>('none');
  const total = session.cards.length;
  const card = queue[0];

  useEffect(() => {
    if (!soon) return;
    const timer = setTimeout(() => setSoon(false), SOON_MS);
    return () => clearTimeout(timer);
  }, [soon]);

  const delays = card ? returnDelays(card.state, new Date()) : null;

  async function finish() {
    await backend.command('study.end', { sessionId: session.sessionId });
    clearStudyRequest();
    onFinish(false);
  }

  async function answer(rating: Answer) {
    if (!card || busy || !flipped) return;
    vibrate();
    const before = queue;
    const next = afterAnswer(queue, rating, new Date());
    setError(null);
    setBusy(true);
    setQueue(next);
    setHistory((h) => [...h, before]);
    setFlipped(false);
    setSoon(rating === 'again');
    const result = await backend.command('study.answer', { sessionId: session.sessionId, cardId: card.id, answer: rating });
    if (!result.ok) {
      setQueue(before);
      setHistory((h) => h.slice(0, -1));
      setFlipped(true);
      setSoon(false);
      setError(s.answerFailed);
      setBusy(false);
      return;
    }
    if (next.length === 0) await finish();
    setBusy(false);
  }

  async function undo() {
    const previous = history[history.length - 1];
    if (!previous || busy) return;
    setBusy(true);
    setError(null);
    const result = await backend.command('study.undo', { sessionId: session.sessionId });
    setBusy(false);
    if (!result.ok) {
      setError(s.actionFailed);
      return;
    }
    setQueue(previous);
    setHistory((h) => h.slice(0, -1));
    setFlipped(true);
    setSoon(false);
  }

  async function suspend() {
    if (!card || busy) return;
    setBusy(true);
    setError(null);
    const result = await backend.command('card.suspend', { cardId: card.id, suspended: true });
    setBusy(false);
    setPanel('none');
    if (!result.ok) {
      setError(s.actionFailed);
      return;
    }
    const next = queue.filter((c) => c.id !== card.id);
    setQueue(next);
    setHistory((h) => h.map((q) => q.filter((c) => c.id !== card.id)));
    setFlipped(false);
    if (next.length === 0) await finish();
  }

  async function exit() {
    await backend.command('study.end', { sessionId: session.sessionId });
    clearStudyRequest();
    // With answers given, he goes to the partial Resumo; with none there is nothing to sum up.
    if (history.length === 0) onLeave();
    else onFinish(true);
  }

  const header = (
    <>
      <Button variant="secondary" aria-label={s.exit} onClick={() => setPanel('exit')}>
        ×
      </Button>
      <div
        className="progress grow"
        role="progressbar"
        aria-label={s.progress}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.max(0, total - queue.length)}
        aria-valuetext={s.remaining(queue.length)}
      >
        <div className="progress-fill" style={{ width: `${total === 0 ? 0 : ((total - queue.length) / total) * 100}%` }} />
      </div>
    </>
  );

  if (panel === 'exit') {
    return (
      <Layer header={header}>
        <EmptyState title={s.exitTitle} text={s.exitText}>
          <div className="stack">
            <Button onClick={() => setPanel('none')}>{s.keepGoing}</Button>
            <Button variant="secondary" onClick={() => void exit()}>
              {s.exitNow}
            </Button>
          </div>
        </EmptyState>
      </Layer>
    );
  }

  if (!card || !delays) return <Layer header={header}>{null}</Layer>;

  return (
    <Layer header={header}>
      <div className="study">
        <h1 className="sr-only">{s.title}</h1>
        {session.training && <Notice>{s.training}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="card-tools" data-hidden={!flipped}>
          <Button variant="secondary" disabled={busy || history.length === 0} onClick={() => void undo()}>
            {s.undo}
          </Button>
          <Button variant="secondary" aria-label={s.more} disabled={busy} onClick={() => setPanel('menu')}>
            ⋯
          </Button>
        </div>
        <div className="flip">
          <div className="flip-inner" data-flipped={flipped} onClick={() => setFlipped(true)}>
            <div className="face front" aria-hidden={flipped}>
              <span className="topic">{card.topicName}</span>
              <Question card={card} />
              {soon && <p role="status">{s.soon}</p>}
            </div>
            <div className="face back" aria-hidden={!flipped}>
              <span className="topic">{card.topicName}</span>
              <Answered card={card} />
            </div>
          </div>
        </div>
        {flipped ? (
          <div className="answers">
            {(['again', 'hard', 'good'] as const).map((rating) => (
              <Button key={rating} variant={rating === 'good' ? 'primary' : 'secondary'} disabled={busy} onClick={() => void answer(rating)}>
                <span>{s[rating]}</span>
                <span className="when">{whenLabel(delays[rating])}</span>
              </Button>
            ))}
          </div>
        ) : (
          <Button onClick={() => setFlipped(true)}>{s.showAnswer}</Button>
        )}
      </div>
      {panel === 'menu' && (
        <Sheet title={s.cardMenu} onClose={() => setPanel('none')}>
          <Button variant="secondary" onClick={() => setPanel('edit')}>
            {s.edit}
          </Button>
          <Button variant="secondary" onClick={() => void suspend()}>
            {s.suspend}
          </Button>
        </Sheet>
      )}
      {panel === 'edit' && (
        <EditCard
          card={card}
          onClose={() => setPanel('none')}
          onSaved={(note) => {
            const patch = (c: StudyCard): StudyCard => (c.noteId === note.id ? { ...c, front: note.front, back: note.back, hint: note.hint } : c);
            // A cloze whose passage was removed no longer has this card.
            const keeps = (c: StudyCard) => c.noteId !== note.id || c.kind === 'basic' || cardIndexes('cloze', note.front).includes(c.clozeIndex);
            const next = queue.filter(keeps).map(patch);
            setQueue(next);
            setHistory((h) => h.map((q) => q.filter(keeps).map(patch)));
            setPanel('none');
            if (next.length === 0) void finish();
          }}
        />
      )}
    </Layer>
  );
}

interface SavedNote {
  readonly id: string;
  readonly front: string;
  readonly back: string;
  readonly hint: string | null;
}

/** Edits the text of the card on screen; saving returns to the same back (docs/spec/estudo.md). */
function EditCard({ card, onClose, onSaved }: { card: StudyCard; onClose: () => void; onSaved: (note: SavedNote) => void }) {
  const { backend } = useServices();
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [hint, setHint] = useState(card.hint ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cloze = card.kind === 'cloze';

  async function save() {
    setSaving(true);
    setError(null);
    const result = await backend.command('note.update', { noteId: card.noteId, front, back: cloze ? undefined : back, hint: hint.trim() === '' ? null : hint });
    setSaving(false);
    if (!result.ok) {
      setError(s.actionFailed);
      return;
    }
    onSaved(result.value);
  }

  return (
    <Sheet title={s.edit} onClose={onClose}>
      {error && <Notice tone="error">{error}</Notice>}
      <label className="field">
        <span className="field-label">{cloze ? s.editClozeFront : s.editFront}</span>
        <textarea value={front} onChange={(e) => setFront(e.target.value)} />
      </label>
      {!cloze && (
        <label className="field">
          <span className="field-label">{s.editBack}</span>
          <textarea value={back} onChange={(e) => setBack(e.target.value)} />
        </label>
      )}
      <label className="field">
        <span className="field-label">{s.editHint}</span>
        <textarea value={hint} onChange={(e) => setHint(e.target.value)} />
      </label>
      <Button disabled={saving} onClick={() => void save()}>
        {saving ? s.saving : s.save}
      </Button>
    </Sheet>
  );
}
