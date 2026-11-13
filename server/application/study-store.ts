// A member's study data: card states, answers and settings (docs/ARQUITETURA.md, "Fluxo de
// eventos"). Every function takes the member id and filters by it: one member's study never
// reaches another, not even an admin (ADR-009). The use cases check the actor; this file only
// reads and writes.
import { newCardState, schedule, type Answer, type SchedulingState } from '../../src/domain/study/scheduler';
import { DEFAULT_STUDY_SETTINGS, normalizeRestDays, type StudySettings } from '../../src/domain/study/settings';
import { nowIso, today, type Context } from './context';

interface CardStateRow {
  stage: SchedulingState['stage'];
  due: string;
  stability: number;
  difficulty: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review: string | null;
  suspended: number;
}

export interface MemberCardState {
  readonly state: SchedulingState;
  readonly suspended: boolean;
}

/** The member's state for a card; a card never answered is new and due now. */
export function cardState(ctx: Context, memberId: string, cardId: string): MemberCardState {
  const [row] = ctx.sql.all<CardStateRow>('SELECT * FROM card_states WHERE member_id = ? AND card_id = ?', memberId, cardId);
  if (!row) return { state: newCardState(ctx.clock.now()), suspended: false };
  return {
    state: {
      stage: row.stage,
      due: row.due,
      stability: row.stability,
      difficulty: row.difficulty,
      scheduledDays: row.scheduled_days,
      learningSteps: row.learning_steps,
      reps: row.reps,
      lapses: row.lapses,
      lastReview: row.last_review,
    },
    suspended: row.suspended === 1,
  };
}

/** Writes the member's state for a card, keeping whether it is suspended. */
export function saveCardState(ctx: Context, memberId: string, cardId: string, state: SchedulingState, suspended?: boolean): void {
  const keep = suspended ?? cardState(ctx, memberId, cardId).suspended;
  ctx.sql.run(
    `INSERT INTO card_states
       (member_id, card_id, stage, due, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review, suspended)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (member_id, card_id) DO UPDATE SET
       stage = excluded.stage, due = excluded.due, stability = excluded.stability, difficulty = excluded.difficulty,
       scheduled_days = excluded.scheduled_days, learning_steps = excluded.learning_steps, reps = excluded.reps,
       lapses = excluded.lapses, last_review = excluded.last_review, suspended = excluded.suspended`,
    memberId,
    cardId,
    state.stage,
    state.due,
    state.stability,
    state.difficulty,
    state.scheduledDays,
    state.learningSteps,
    state.reps,
    state.lapses,
    state.lastReview,
    keep ? 1 : 0,
  );
}

/** Suspending is the member's own: a system card suspended by one member stays for the others. */
export function setSuspended(ctx: Context, memberId: string, cardId: string, suspended: boolean): void {
  saveCardState(ctx, memberId, cardId, cardState(ctx, memberId, cardId).state, suspended);
}

export type StudySessionKind = 'review' | 'cram' | 'retry' | 'selected';

/** Opens a study session; review sessions count toward accuracy, the others are training. */
export function startStudySession(ctx: Context, memberId: string, kind: StudySessionKind): string {
  const id = ctx.ids.next();
  ctx.sql.run(
    'INSERT INTO study_sessions (id, member_id, kind, is_training, study_day, started_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    memberId,
    kind,
    kind === 'review' ? 0 : 1,
    today(ctx),
    nowIso(ctx),
  );
  return id;
}

export function endStudySession(ctx: Context, memberId: string, sessionId: string): void {
  ctx.sql.run('UPDATE study_sessions SET ended_at = ? WHERE id = ? AND member_id = ? AND ended_at IS NULL', nowIso(ctx), sessionId, memberId);
}

interface SessionRow {
  id: string;
  is_training: number;
  ended_at: string | null;
}

function openSession(ctx: Context, memberId: string, sessionId: string): SessionRow | null {
  const [row] = ctx.sql.all<SessionRow>('SELECT id, is_training, ended_at FROM study_sessions WHERE id = ? AND member_id = ?', sessionId, memberId);
  return row && row.ended_at === null ? row : null;
}

/**
 * Records an answer: schedules the card, stores its new state and the answer, with the previous
 * state so it can be undone. Run inside the command's transaction. Null when the session is not
 * the member's or already ended.
 */
export function recordAnswer(ctx: Context, memberId: string, sessionId: string, cardId: string, answer: Answer): SchedulingState | null {
  const session = openSession(ctx, memberId, sessionId);
  if (!session) return null;
  const now = ctx.clock.now();
  const previous = cardState(ctx, memberId, cardId);
  const next = schedule(previous.state, answer, now);
  saveCardState(ctx, memberId, cardId, next, previous.suspended);
  ctx.sql.run(
    `INSERT INTO reviews (id, member_id, card_id, session_id, rating, reviewed_at, study_day, is_training, previous_state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ctx.ids.next(),
    memberId,
    cardId,
    sessionId,
    answer,
    now.toISOString(),
    today(ctx),
    session.is_training,
    JSON.stringify(previous.state),
  );
  return next;
}

/** Undoes the session's last answer: deletes it and restores the card's previous state. */
export function undoLastAnswer(ctx: Context, memberId: string, sessionId: string): { cardId: string } | null {
  if (!openSession(ctx, memberId, sessionId)) return null;
  const [last] = ctx.sql.all<{ id: string; card_id: string; previous_state: string }>(
    'SELECT id, card_id, previous_state FROM reviews WHERE session_id = ? AND member_id = ? ORDER BY reviewed_at DESC, rowid DESC LIMIT 1',
    sessionId,
    memberId,
  );
  if (!last) return null;
  saveCardState(ctx, memberId, last.card_id, JSON.parse(last.previous_state) as SchedulingState);
  ctx.sql.run('DELETE FROM reviews WHERE id = ?', last.id);
  return { cardId: last.card_id };
}

interface SettingsRow {
  new_per_day: number;
  rest_days: string;
  routine_when: string | null;
  routine_where: string | null;
  streak_repair_month: string | null;
}

/** The member's settings; the defaults until they change something in Ajustes. */
export function studySettings(ctx: Context, memberId: string): StudySettings {
  const [row] = ctx.sql.all<SettingsRow>('SELECT * FROM study_settings WHERE member_id = ?', memberId);
  if (!row) return DEFAULT_STUDY_SETTINGS;
  return {
    newPerDay: row.new_per_day,
    restDays: normalizeRestDays(JSON.parse(row.rest_days) as unknown[]),
    routineWhen: row.routine_when,
    routineWhere: row.routine_where,
    streakRepairMonth: row.streak_repair_month,
  };
}

export function saveStudySettings(ctx: Context, memberId: string, settings: StudySettings): void {
  ctx.sql.run(
    `INSERT INTO study_settings (member_id, new_per_day, rest_days, routine_when, routine_where, streak_repair_month)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (member_id) DO UPDATE SET
       new_per_day = excluded.new_per_day, rest_days = excluded.rest_days, routine_when = excluded.routine_when,
       routine_where = excluded.routine_where, streak_repair_month = excluded.streak_repair_month`,
    memberId,
    settings.newPerDay,
    JSON.stringify(normalizeRestDays(settings.restDays)),
    settings.routineWhen,
    settings.routineWhere,
    settings.streakRepairMonth,
  );
}
