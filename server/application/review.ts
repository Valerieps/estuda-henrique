// The study session (docs/spec/estudo.md): which cards enter the day's queue, and answering,
// undoing and ending. Everything reads and writes the actor's own state (ADR-009); a card is
// eligible only when the actor may see it and has not suspended it.
import type { AheadTopic, StudyCard, StudyKind, StudyOutlook, StudySessionView } from '../../src/application/api-contract';
import type { NoteKind } from '../../src/domain/study/cloze';
import { isAnswer, newCardState, type SchedulingState } from '../../src/domain/study/scheduler';
import { endOfStudyDay } from '../../src/domain/study/study-day';
import { failure, today, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { NOTE_EDITS, noteText } from './note-text';
import { endStudySession, recordAnswer, startStudySession, stateFromRow, studySettings, undoLastAnswer, type CardStateRow } from './study-store';

type Input = Record<string, unknown>;

const KINDS: readonly StudyKind[] = ['review', 'cram', 'retry', 'selected'];
const MAX_LIMIT = 200;
const MAX_TRAINING_CARDS = 500;

interface EligibleRow extends Omit<CardStateRow, 'stage' | 'due' | 'suspended'> {
  id: string;
  cloze_index: number;
  note_id: string;
  note_kind: NoteKind;
  front: string;
  back: string;
  hint: string | null;
  topic_id: string;
  topic_name: string;
  stage: CardStateRow['stage'] | null;
  due: string | null;
}

/**
 * Every card the actor can study right now, in the base order (topic, then the order the notes
 * were written): visible to them, not hidden by a deleted note or a dropped passage, not suspended.
 */
function eligibleCards(ctx: Context, actor: Member): StudyCard[] {
  const now = ctx.clock.now();
  return ctx.sql
    .all<EligibleRow>(
      `SELECT cards.id, cards.cloze_index, notes.id AS note_id, notes.kind AS note_kind,
              ${noteText('front')} AS front, ${noteText('back')} AS back, ${noteText('hint')} AS hint,
              topics.id AS topic_id, topics.name AS topic_name,
              cs.stage, cs.due, cs.stability, cs.difficulty, cs.scheduled_days, cs.learning_steps, cs.reps, cs.lapses, cs.last_review
       FROM cards
       JOIN notes ON notes.id = cards.note_id
       JOIN topics ON topics.id = notes.topic_id
       JOIN subjects ON subjects.id = topics.subject_id
       LEFT JOIN card_states cs ON cs.card_id = cards.id AND cs.member_id = ?
       ${NOTE_EDITS}
       WHERE cards.retired = 0 AND notes.deleted_at IS NULL AND subjects.archived = 0
         AND (notes.owner_id IS NULL OR notes.owner_id = ?)
         AND COALESCE(cs.suspended, 0) = 0
       ORDER BY topics.position, topics.created_at, notes.created_at, notes.rowid, cards.cloze_index`,
      actor.id,
      actor.id,
      actor.id,
    )
    .map((row) => ({
      id: row.id,
      noteId: row.note_id,
      topicId: row.topic_id,
      topicName: row.topic_name,
      kind: row.note_kind,
      clozeIndex: row.cloze_index,
      front: row.front,
      back: row.back,
      hint: row.hint,
      state: row.stage && row.due ? stateFromRow({ ...row, stage: row.stage, due: row.due }) : newCardState(now),
    }));
}

/** How many cards the actor saw for the first time today: the new cards the daily limit counts. */
function newCardsSeenToday(ctx: Context, actor: Member): number {
  const day = today(ctx);
  const [{ seen }] = ctx.sql.all<{ seen: number }>(
    `SELECT COUNT(DISTINCT r.card_id) AS seen FROM reviews r
     WHERE r.member_id = ? AND r.study_day = ?
       AND NOT EXISTS (SELECT 1 FROM reviews p WHERE p.member_id = r.member_id AND p.card_id = r.card_id AND p.study_day < ?)`,
    actor.id,
    day,
    day,
  );
  return seen;
}

const byDue = (a: StudyCard, b: StudyCard) => a.state.due.localeCompare(b.state.due);

/**
 * The day's queue: cards in learning, then reviews due today, then new cards up to the daily
 * limit. Nothing comes before its time: a review due tomorrow stays out.
 */
export function dailyQueue(ctx: Context, actor: Member, limit: number | null): StudyCard[] {
  const endOfDay = endOfStudyDay(ctx.clock.now()).toISOString();
  const cards = eligibleCards(ctx, actor);
  const dueToday = cards.filter((c) => c.state.stage !== 'new' && c.state.due < endOfDay);
  const learning = dueToday.filter((c) => c.state.stage === 'learning' || c.state.stage === 'relearning').sort(byDue);
  const reviews = dueToday.filter((c) => c.state.stage === 'review').sort(byDue);
  const room = Math.max(0, studySettings(ctx, actor.id).newPerDay - newCardsSeenToday(ctx, actor));
  const fresh = cards.filter((c) => c.state.stage === 'new').slice(0, room);
  const queue = [...learning, ...reviews, ...fresh];
  return limit === null ? queue : queue.slice(0, limit);
}

/** Adiantar novas: how many new cards one tap brings. */
const AHEAD_NEW = 10;

/** Adiantar novas: the first new cards of a topic, past the daily limit. */
function aheadQueue(ctx: Context, actor: Member, topicId: string): StudyCard[] {
  return eligibleCards(ctx, actor)
    .filter((c) => c.topicId === topicId && c.state.stage === 'new')
    .slice(0, AHEAD_NEW);
}

/** Cards still left in today's queue: what Mais 5? offers. */
export function remainingToday(ctx: Context, actor: Member): number {
  return dailyQueue(ctx, actor, null).length;
}

/** What is left today, and the topics with new cards left (the one with the fewest seen first). */
export function studyOutlook(ctx: Context, actor: Member): StudyOutlook {
  const byTopic = new Map<string, AheadTopic>();
  for (const card of eligibleCards(ctx, actor)) {
    const entry = byTopic.get(card.topicId) ?? { topicId: card.topicId, name: card.topicName, seen: 0, total: 0, newLeft: 0 };
    const fresh = card.state.stage === 'new';
    byTopic.set(card.topicId, { ...entry, total: entry.total + 1, seen: entry.seen + (fresh ? 0 : 1), newLeft: entry.newLeft + (fresh ? 1 : 0) });
  }
  const aheadTopics = [...byTopic.values()].filter((t) => t.newLeft > 0);
  const suggested = aheadTopics.reduce<AheadTopic | null>((best, t) => (best === null || t.seen < best.seen ? t : best), null);
  return { remainingToday: remainingToday(ctx, actor), aheadTopics, suggestedTopicId: suggested?.topicId ?? null };
}

/** Training: exactly the cards asked for, in that order, when the actor may study them. */
function trainingQueue(ctx: Context, actor: Member, cardIds: readonly string[]): StudyCard[] {
  const eligible = new Map(eligibleCards(ctx, actor).map((c) => [c.id, c]));
  return [...new Set(cardIds)].flatMap((id) => eligible.get(id) ?? []);
}

export function startStudy(ctx: Context, actor: Member, input: Input): CommandResult<StudySessionView | null> {
  const kind = input.kind as StudyKind;
  if (!KINDS.includes(kind)) return failure('invalid');
  let cards: StudyCard[];
  if (kind === 'review') {
    const limit = input.limit;
    if (limit !== undefined && (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT)) return failure('invalid');
    const ahead = input.aheadTopicId;
    if (ahead !== undefined) {
      if (typeof ahead !== 'string' || limit !== undefined) return failure('invalid');
      cards = aheadQueue(ctx, actor, ahead);
    } else {
      cards = dailyQueue(ctx, actor, limit === undefined ? null : (limit as number));
    }
  } else {
    const ids = input.cardIds;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_TRAINING_CARDS || !ids.every((id) => typeof id === 'string')) return failure('invalid');
    cards = trainingQueue(ctx, actor, ids as string[]);
  }
  if (cards.length === 0) return { ok: true, value: null, changed: [] };
  const sessionId = startStudySession(ctx, actor.id, kind);
  return { ok: true, value: { sessionId, kind, training: kind !== 'review', cards }, changed: ['study'] };
}

/** True when the actor may study the card (a personal card of someone else never is). */
function studiableCard(ctx: Context, actor: Member, cardId: unknown): cardId is string {
  if (typeof cardId !== 'string') return false;
  const [row] = ctx.sql.all<{ id: string }>(
    `SELECT cards.id FROM cards JOIN notes ON notes.id = cards.note_id
     WHERE cards.id = ? AND cards.retired = 0 AND notes.deleted_at IS NULL AND (notes.owner_id IS NULL OR notes.owner_id = ?)`,
    cardId,
    actor.id,
  );
  return row !== undefined;
}

export function answerCard(ctx: Context, actor: Member, input: Input): CommandResult<{ state: SchedulingState }> {
  if (typeof input.sessionId !== 'string' || !isAnswer(input.answer)) return failure('invalid');
  if (!studiableCard(ctx, actor, input.cardId)) return failure('not_found');
  const state = recordAnswer(ctx, actor.id, input.sessionId, input.cardId, input.answer);
  if (!state) return failure('not_found');
  return { ok: true, value: { state }, changed: ['study'] };
}

export function undoAnswer(ctx: Context, actor: Member, input: Input): CommandResult<{ cardId: string; state: SchedulingState }> {
  if (typeof input.sessionId !== 'string') return failure('invalid');
  const undone = undoLastAnswer(ctx, actor.id, input.sessionId);
  if (!undone) return failure('not_found');
  return { ok: true, value: undone, changed: ['study'] };
}

export function endStudy(ctx: Context, actor: Member, input: Input): CommandResult<null> {
  if (typeof input.sessionId !== 'string') return failure('invalid');
  endStudySession(ctx, actor.id, input.sessionId);
  return { ok: true, value: null, changed: ['study'] };
}
