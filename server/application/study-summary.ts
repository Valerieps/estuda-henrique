// The Resumo of a study session (docs/spec/estudo.md): what he answered, how it went, which
// topics moved and which cards he got wrong. Everything reads the actor's own session (ADR-009).
import type { StudySummary, SummaryCard, SummaryTopic } from '../../src/application/api-contract';
import type { NoteKind } from '../../src/domain/study/cloze';
import { daysBetween, topicMastery, LONG_TERM_GAP_DAYS, type DiagnosticCard } from '../../src/domain/study/diagnostic';
import { retrievability, type CardStage, type SchedulingState } from '../../src/domain/study/scheduler';
import { QueryError, type Context } from './context';
import { thermometer } from './diagnostics';
import type { Member } from './members';
import { remainingToday } from './review';
import { stateFromRow } from './study-store';

/** The day's time past which the Resumo says "1h hoje". */
const HOUR_SECONDS = 3600;

interface SessionRow {
  kind: StudySummary['kind'];
  is_training: number;
  study_day: string;
  started_at: string;
}

interface ReviewRow {
  card_id: string;
  rating: 'again' | 'hard' | 'good';
  reviewed_at: string;
  study_day: string;
  previous_state: string | null;
  previous_day: string | null;
  topic_id: string;
  topic_name: string;
  note_kind: NoteKind;
  cloze_index: number;
  front: string;
  back: string;
}

interface StateRow {
  card_id: string;
  topic_id: string;
  stage: CardStage | null;
  due: string | null;
  stability: number | null;
  difficulty: number | null;
  scheduled_days: number | null;
  learning_steps: number | null;
  reps: number | null;
  lapses: number | null;
  last_review: string | null;
  suspended: number | null;
}

const seconds = (from: string, to: string) => Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));

/** Seconds from a session's start to its last answer; a session with no answer has none. */
function sessionSeconds(ctx: Context, memberId: string, sessionId: string, startedAt: string): number {
  const [row] = ctx.sql.all<{ last: string | null }>('SELECT MAX(reviewed_at) AS last FROM reviews WHERE session_id = ? AND member_id = ?', sessionId, memberId);
  return row?.last ? seconds(startedAt, row.last) : 0;
}

/** The mastery of each topic at `at`, from the cards' states (`override` replaces some of them). */
function masteryByTopic(rows: readonly StateRow[], at: Date, override: ReadonlyMap<string, SchedulingState | null>): Map<string, number | null> {
  const cards: DiagnosticCard[] = rows.map((row) => {
    const state = override.has(row.card_id) ? (override.get(row.card_id) ?? null) : row.stage ? stateFromRow({ ...row, stage: row.stage } as Parameters<typeof stateFromRow>[0]) : null;
    return {
      cardId: row.card_id,
      topicId: row.topic_id,
      mastery: state && state.stage !== 'new' ? retrievability(state, at) : null,
      suspended: row.suspended === 1,
      againCount: 0,
    };
  });
  const topics = new Map<string, DiagnosticCard[]>();
  for (const card of cards) topics.set(card.topicId, [...(topics.get(card.topicId) ?? []), card]);
  return new Map([...topics].map(([id, own]) => [id, topicMastery(own)]));
}

export function studySummary(ctx: Context, actor: Member, input: Record<string, unknown>): StudySummary | QueryError {
  if (typeof input.sessionId !== 'string') return new QueryError('invalid');
  const [session] = ctx.sql.all<SessionRow>('SELECT kind, is_training, study_day, started_at FROM study_sessions WHERE id = ? AND member_id = ?', input.sessionId, actor.id);
  if (!session) return new QueryError('not_found');

  const reviews = ctx.sql.all<ReviewRow>(
    `SELECT r.card_id, r.rating, r.reviewed_at, r.study_day, r.previous_state,
            (SELECT MAX(p.study_day) FROM reviews p
              WHERE p.member_id = r.member_id AND p.card_id = r.card_id AND p.session_id != r.session_id AND p.reviewed_at < r.reviewed_at) AS previous_day,
            notes.topic_id, topics.name AS topic_name, notes.kind AS note_kind, cards.cloze_index, notes.front, notes.back
     FROM reviews r
     JOIN cards ON cards.id = r.card_id
     JOIN notes ON notes.id = cards.note_id
     JOIN topics ON topics.id = notes.topic_id
     WHERE r.session_id = ? AND r.member_id = ?
     ORDER BY r.reviewed_at, r.rowid`,
    input.sessionId,
    actor.id,
  );

  const counts = { again: 0, hard: 0, good: 0 };
  const firsts = new Map<string, ReviewRow>();
  for (const review of reviews) {
    counts[review.rating] += 1;
    if (!firsts.has(review.card_id)) firsts.set(review.card_id, review);
  }
  const first = [...firsts.values()];
  const right = first.filter((r) => r.rating !== 'again').length;

  const wrong: SummaryCard[] = first
    .filter((r) => r.rating === 'again')
    .map((r) => ({ cardId: r.card_id, topicName: r.topic_name, kind: r.note_kind, clozeIndex: r.cloze_index, front: r.front, back: r.back }));
  const retryCardIds = first.filter((r) => r.rating !== 'good').map((r) => r.card_id);

  const newSeen = first.filter((r) => r.previous_state !== null && (JSON.parse(r.previous_state) as SchedulingState).stage === 'new').length;
  const recalled = first.filter((r) => r.rating !== 'again' && r.previous_day !== null && daysBetween(r.previous_day, r.study_day) >= LONG_TERM_GAP_DAYS).length;

  const seconds_ = sessionSeconds(ctx, actor.id, input.sessionId, session.started_at);
  const daySessions = ctx.sql.all<{ id: string; started_at: string }>(
    'SELECT id, started_at FROM study_sessions WHERE member_id = ? AND study_day = ? ORDER BY started_at, rowid',
    actor.id,
    session.study_day,
  );
  const daySeconds = daySessions.reduce((sum, s) => sum + sessionSeconds(ctx, actor.id, s.id, s.started_at), 0);
  // The day's time before this session: the sessions that began ahead of it.
  const position = daySessions.findIndex((s) => s.id === input.sessionId);
  const dayBefore = daySessions.slice(0, position).reduce((sum, s) => sum + sessionSeconds(ctx, actor.id, s.id, s.started_at), 0);

  const topics = movedTopics(ctx, actor.id, first, session.started_at, reviews.at(-1)?.reviewed_at ?? session.started_at);

  const remaining = remainingToday(ctx, actor);
  return {
    kind: session.kind,
    training: session.is_training === 1,
    answers: reviews.length,
    counts,
    accuracy: first.length === 0 ? null : right / first.length,
    sessionSeconds: seconds_,
    daySeconds,
    hourReached: dayBefore < HOUR_SECONDS && dayBefore + seconds_ >= HOUR_SECONDS,
    newSeen,
    recalled,
    topics,
    wrong,
    retryCardIds,
    remainingToday: remaining,
    longTermRate: remaining === 0 ? thermometer(ctx, actor).longTermRate : null,
  };
}

/** The topics touched by the session whose mastery, in whole percent, is not what it was at the start. */
function movedTopics(ctx: Context, memberId: string, first: readonly ReviewRow[], startedAt: string, endedAt: string): SummaryTopic[] {
  if (first.length === 0) return [];
  const touched = [...new Set(first.map((r) => r.topic_id))];
  const names = new Map(first.map((r) => [r.topic_id, r.topic_name]));
  const rows = ctx.sql.all<StateRow>(
    `SELECT cards.id AS card_id, notes.topic_id, cs.stage, cs.due, cs.stability, cs.difficulty, cs.scheduled_days, cs.learning_steps, cs.reps, cs.lapses, cs.last_review, cs.suspended
     FROM cards
     JOIN notes ON notes.id = cards.note_id
     LEFT JOIN card_states cs ON cs.card_id = cards.id AND cs.member_id = ?
     WHERE cards.retired = 0 AND notes.deleted_at IS NULL AND (notes.owner_id IS NULL OR notes.owner_id = ?)
       AND notes.topic_id IN (${touched.map(() => '?').join(', ')})`,
    memberId,
    memberId,
    ...touched,
  );
  // The state each answered card had before its first answer of the session.
  const previous = new Map(first.map((r) => [r.card_id, r.previous_state ? (JSON.parse(r.previous_state) as SchedulingState) : null]));
  const before = masteryByTopic(rows, new Date(startedAt), previous);
  const after = masteryByTopic(rows, new Date(endedAt), new Map());
  const percent = (value: number | null) => (value === null ? null : Math.round(value * 100));
  return touched.flatMap((topicId): SummaryTopic[] => {
    const to = after.get(topicId) ?? null;
    const from = before.get(topicId) ?? null;
    if (to === null || percent(to) === percent(from)) return [];
    return [{ topicId, name: names.get(topicId) ?? '', before: from, after: to }];
  });
}
