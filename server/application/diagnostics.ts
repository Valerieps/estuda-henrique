// The diagnosis queries and the daily snapshots (docs/spec/diagnostico.md). Everything is the
// reader's own: the cards are the system's plus their personal ones, and the states and answers
// are filtered by their id (ADR-009). The rules live in src/domain/study/diagnostic.ts.
import type { ExamCards, Thermometer, ThermometerTopic, TopicCard, TopicCardsView, TrendPoint, WorstCard, WorstCardsGroup } from '../../src/application/api-contract';
import type { NoteKind } from '../../src/domain/study/cloze';
import {
  isProblemCard,
  isWeak,
  longTermMemory,
  orderWorstCards,
  rankTopics,
  recallEvents,
  savedCards,
  topicCoverage,
  topicMastery,
  type AnswerRecord,
  type DiagnosticCard,
} from '../../src/domain/study/diagnostic';
import { examSelection } from '../../src/domain/study/exam';
import { retrievability, type CardStage, type SchedulingState } from '../../src/domain/study/scheduler';
import { addDays } from '../../src/domain/study/study-day';
import { QueryError, today, type Context } from './context';
import type { Member } from './members';
import { NOTE_EDITS, noteText } from './note-text';

/** The minilinha shows the last 4 weeks. */
const TREND_DAYS = 28;

interface CardRow {
  card_id: string;
  cloze_index: number;
  note_id: string;
  topic_id: string;
  owner_id: string | null;
  kind: NoteKind;
  front: string;
  back: string;
  hint: string | null;
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

interface MemberCard extends DiagnosticCard {
  readonly noteId: string;
  readonly origin: 'system' | 'personal';
  readonly kind: NoteKind;
  readonly front: string;
  readonly back: string;
  readonly hint: string | null;
  readonly clozeIndex: number;
}

interface TopicRow {
  id: string;
  name: string;
}

/** The member's cards (system and personal, not retired, not deleted) with their own states. */
function memberCards(ctx: Context, memberId: string): MemberCard[] {
  const now = ctx.clock.now();
  const agains = new Map(
    ctx.sql
      .all<{ card_id: string; n: number }>("SELECT card_id, COUNT(*) AS n FROM reviews WHERE member_id = ? AND rating = 'again' GROUP BY card_id", memberId)
      .map((r) => [r.card_id, r.n]),
  );
  const rows = ctx.sql.all<CardRow>(
    `SELECT cards.id AS card_id, cards.cloze_index, notes.id AS note_id, notes.topic_id, notes.owner_id, notes.kind,
            ${noteText('front')} AS front, ${noteText('back')} AS back, ${noteText('hint')} AS hint,
            cs.stage, cs.due, cs.stability, cs.difficulty, cs.scheduled_days, cs.learning_steps, cs.reps, cs.lapses, cs.last_review, cs.suspended
     FROM cards
     JOIN notes ON notes.id = cards.note_id
     LEFT JOIN card_states cs ON cs.card_id = cards.id AND cs.member_id = ?
     ${NOTE_EDITS}
     WHERE cards.retired = 0 AND notes.deleted_at IS NULL AND (notes.owner_id IS NULL OR notes.owner_id = ?)
     ORDER BY notes.created_at, notes.rowid, cards.cloze_index`,
    memberId,
    memberId,
    memberId,
  );
  return rows.map((row) => {
    // No state row, or a row that never left "new": the card was not studied yet.
    const studied = row.stage !== null && row.stage !== 'new';
    return {
      cardId: row.card_id,
      topicId: row.topic_id,
      mastery: studied ? retrievability(stateOf(row), now) : null,
      suspended: row.suspended === 1,
      againCount: agains.get(row.card_id) ?? 0,
      noteId: row.note_id,
      origin: row.owner_id === null ? 'system' : 'personal',
      kind: row.kind,
      front: row.front,
      back: row.back,
      hint: row.hint,
      clozeIndex: row.cloze_index,
    };
  });
}

function stateOf(row: CardRow): SchedulingState {
  return {
    stage: row.stage as CardStage,
    due: row.due as string,
    stability: row.stability as number,
    difficulty: row.difficulty as number,
    scheduledDays: row.scheduled_days as number,
    learningSteps: row.learning_steps as number,
    reps: row.reps as number,
    lapses: row.lapses as number,
    lastReview: row.last_review,
  };
}

function topics(ctx: Context): TopicRow[] {
  return ctx.sql.all<TopicRow>(
    `SELECT topics.id, topics.name FROM topics JOIN subjects ON subjects.id = topics.subject_id
     WHERE subjects.archived = 0 ORDER BY subjects.position, topics.position, topics.created_at, topics.id`,
  );
}

function answerHistory(ctx: Context, memberId: string): AnswerRecord[] {
  return ctx.sql
    .all<{ card_id: string; rating: AnswerRecord['answer']; study_day: string; is_training: number }>(
      'SELECT card_id, rating, study_day, is_training FROM reviews WHERE member_id = ? ORDER BY reviewed_at, rowid',
      memberId,
    )
    .map((r) => ({ cardId: r.card_id, answer: r.rating, day: r.study_day, training: r.is_training === 1 }));
}

/** Long-term memory and saved cards of the member, today. */
function longTermSummary(ctx: Context, memberId: string) {
  const events = recallEvents(answerHistory(ctx, memberId));
  const memory = longTermMemory(events, today(ctx));
  return { longTermRate: memory.rate, longTermAnswers: memory.answers, savedCards: savedCards(events) };
}

/** Each topic's mastery now, with its coverage; the topics with no card at all are left out. */
function topicStandings(ctx: Context, memberId: string) {
  const cards = memberCards(ctx, memberId);
  return topics(ctx)
    .map((topic) => {
      const own = cards.filter((c) => c.topicId === topic.id);
      return { topic, own, mastery: topicMastery(own), ...topicCoverage(own) };
    })
    .filter((t) => t.total > 0);
}

export function thermometer(ctx: Context, actor: Member): Thermometer {
  const from = addDays(today(ctx), -(TREND_DAYS - 1));
  const trends = new Map<string, TrendPoint[]>();
  for (const row of ctx.sql.all<{ topic_id: string; day: string; mastery: number }>(
    'SELECT topic_id, day, mastery FROM topic_snapshots WHERE member_id = ? AND day >= ? ORDER BY day',
    actor.id,
    from,
  )) {
    trends.set(row.topic_id, [...(trends.get(row.topic_id) ?? []), { day: row.day, mastery: row.mastery }]);
  }
  const items: ThermometerTopic[] = topicStandings(ctx, actor.id).map((t) => ({
    id: t.topic.id,
    name: t.topic.name,
    mastery: t.mastery,
    weak: isWeak(t.mastery),
    seen: t.seen,
    total: t.total,
    trend: trends.get(t.topic.id) ?? [],
  }));
  return { topics: rankTopics(items), ...longTermSummary(ctx, actor.id) };
}

export function worstCards(ctx: Context, actor: Member, input: Record<string, unknown>): WorstCardsGroup[] | QueryError {
  if (input.topicId !== undefined && typeof input.topicId !== 'string') return new QueryError('invalid');
  const lastSeen = new Map(
    ctx.sql
      .all<{ card_id: string; day: string }>('SELECT card_id, MAX(study_day) AS day FROM reviews WHERE member_id = ? GROUP BY card_id', actor.id)
      .map((r) => [r.card_id, r.day]),
  );
  const groups = topicStandings(ctx, actor.id)
    .filter((t) => input.topicId === undefined || t.topic.id === input.topicId)
    .map((t) => ({
      topicId: t.topic.id,
      topicName: t.topic.name,
      mastery: t.mastery,
      cards: orderWorstCards(t.own).map(
        (c): WorstCard => ({
          cardId: c.cardId,
          noteId: c.noteId,
          origin: c.origin,
          kind: c.kind,
          front: c.front,
          back: c.back,
          hint: c.hint,
          clozeIndex: c.clozeIndex,
          mastery: c.mastery as number,
          againCount: c.againCount,
          problem: isProblemCard(c.againCount),
          lastSeenDay: lastSeen.get(c.cardId) ?? null,
        }),
      ),
    }))
    .filter((g) => g.cards.length > 0);
  if (input.topicId !== undefined && groups.length === 0 && !topics(ctx).some((t) => t.id === input.topicId)) return new QueryError('not_found');
  return rankTopics(groups);
}

export function topicCards(ctx: Context, actor: Member, input: Record<string, unknown>): TopicCardsView | QueryError {
  if (typeof input.topicId !== 'string') return new QueryError('invalid');
  const topic = topics(ctx).find((t) => t.id === input.topicId);
  if (!topic) return new QueryError('not_found');
  const lastSeen = new Map(
    ctx.sql
      .all<{ card_id: string; day: string }>('SELECT card_id, MAX(study_day) AS day FROM reviews WHERE member_id = ? GROUP BY card_id', actor.id)
      .map((r) => [r.card_id, r.day]),
  );
  const own = memberCards(ctx, actor.id).filter((c) => c.topicId === topic.id);
  const cards = own.map(
    (c): TopicCard => ({
      cardId: c.cardId,
      noteId: c.noteId,
      origin: c.origin,
      kind: c.kind,
      front: c.front,
      back: c.back,
      hint: c.hint,
      clozeIndex: c.clozeIndex,
      mastery: c.mastery,
      againCount: c.againCount,
      problem: isProblemCard(c.againCount),
      suspended: c.suspended,
      lastSeenDay: lastSeen.get(c.cardId) ?? null,
    }),
  );
  return { topicId: topic.id, topicName: topic.name, mastery: topicMastery(own), ...topicCoverage(own), cards };
}

// ---- Daily snapshots ----

/** Writes today's snapshot for the member: each topic's mastery, long-term memory, saved cards. */
export function recordSnapshot(ctx: Context, memberId: string): void {
  const day = today(ctx);
  for (const t of topicStandings(ctx, memberId)) {
    if (t.mastery === null) continue;
    ctx.sql.run(
      `INSERT INTO topic_snapshots (member_id, topic_id, day, mastery) VALUES (?, ?, ?, ?)
       ON CONFLICT (member_id, topic_id, day) DO UPDATE SET mastery = excluded.mastery`,
      memberId,
      t.topic.id,
      day,
      t.mastery,
    );
  }
  const summary = longTermSummary(ctx, memberId);
  ctx.sql.run(
    `INSERT INTO daily_snapshots (member_id, day, long_term_rate, long_term_answers, saved_cards) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (member_id, day) DO UPDATE SET
       long_term_rate = excluded.long_term_rate, long_term_answers = excluded.long_term_answers, saved_cards = excluded.saved_cards`,
    memberId,
    day,
    summary.longTermRate,
    summary.longTermAnswers,
    summary.savedCards,
  );
}

/**
 * Once a day, from the member's first answer on: records the snapshot when today has none, and
 * refreshes it while they keep answering. A member who never answered has no history to keep.
 */
export function recordDueSnapshots(ctx: Context): void {
  const day = today(ctx);
  const due = ctx.sql.all<{ id: string }>(
    `SELECT members.id FROM members
     WHERE members.active = 1
       AND EXISTS (SELECT 1 FROM reviews WHERE reviews.member_id = members.id)
       AND (NOT EXISTS (SELECT 1 FROM daily_snapshots WHERE member_id = members.id AND day = ?)
            OR EXISTS (SELECT 1 FROM reviews WHERE member_id = members.id AND study_day = ?))`,
    day,
    day,
  );
  for (const member of due) recordSnapshot(ctx, member.id);
}

export function examCards(ctx: Context, actor: Member, input: Record<string, unknown>): ExamCards | QueryError {
  const { topicIds, scope } = input;
  if (!Array.isArray(topicIds) || !topicIds.every((id) => typeof id === 'string') || (scope !== 'all' && scope !== 'weakest')) {
    return new QueryError('invalid');
  }
  const picked = examSelection(memberCards(ctx, actor.id), topicIds as string[], scope);
  return { cardIds: [...picked.cardIds], seen: picked.seen, fresh: picked.fresh };
}
