import { beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import type { Context } from './context';
import { QueryError } from './context';
import { recordDueSnapshots, recordSnapshot, thermometer, worstCards } from './diagnostics';
import type { Member } from './members';
import { migrate } from './schema';
import { recordAnswer, setSuspended, startStudySession, type StudySessionKind } from './study-store';

let clock: ReturnType<typeof fixedClock>;
let ctx: Context;

const member = (id: string): Member => ({ id, name: id, email: `${id}@example.com`, photoUrl: null, roles: [] }) as unknown as Member;
const henrique = member('henrique');
const outro = member('outro');

function addCards(topic: string, count: number, prefix = topic, ownerId: string | null = null): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const noteId = `n-${prefix}-${i}`;
    ctx.sql.run(
      "INSERT INTO notes (id, topic_id, owner_id, kind, front, back, created_at, updated_at) VALUES (?, ?, ?, 'basic', ?, 'b', '2026-11-01', '2026-11-01')",
      noteId,
      topic,
      ownerId,
      `Pergunta ${prefix} ${i}`,
    );
    ctx.sql.run('INSERT INTO cards (id, note_id, cloze_index) VALUES (?, ?, 0)', `c-${prefix}-${i}`, noteId);
    ids.push(`c-${prefix}-${i}`);
  }
  return ids;
}

/** Answers cards on `iso`, in one session of `kind`. */
function answer(memberId: string, iso: string, cardIds: string[], rating: 'again' | 'hard' | 'good', kind: StudySessionKind = 'review'): void {
  clock.set(iso);
  const session = startStudySession(ctx, memberId, kind);
  for (const id of cardIds) recordAnswer(ctx, memberId, session, id, rating);
}

beforeEach(() => {
  clock = fixedClock('2026-10-01T15:00:00Z');
  ctx = { sql: memorySql(), clock, ids: sequentialIds() };
  migrate(ctx.sql);
  for (const id of ['henrique', 'outro']) {
    ctx.sql.run("INSERT INTO members (id, email, name, joined_at) VALUES (?, ?, ?, '2026-10-01')", id, `${id}@example.com`, id);
  }
  ctx.sql.run("INSERT INTO topics (id, subject_id, name, position, created_at) VALUES ('citologia', 'biologia', 'Citologia', 0, '2026-10-01')");
  ctx.sql.run("INSERT INTO topics (id, subject_id, name, position, created_at) VALUES ('genetica', 'biologia', 'Genética', 1, '2026-10-01')");
  ctx.sql.run("INSERT INTO topics (id, subject_id, name, position, created_at) VALUES ('vazio', 'biologia', 'Sem cartas', 2, '2026-10-01')");
});

describe('thermometer', () => {
  it('shows "—" and the coverage while nothing was studied', () => {
    addCards('citologia', 3);
    clock.set('2026-11-13T15:00:00Z');
    expect(thermometer(ctx, henrique)).toEqual({
      topics: [{ id: 'citologia', name: 'Citologia', mastery: null, weak: false, seen: 0, total: 3, trend: [] }],
      longTermRate: null,
      longTermAnswers: 0,
      savedCards: 0,
    });
  });

  it('ranks the weakest topic first and lets mastery fall when he stops studying', () => {
    const cito = addCards('citologia', 2);
    const gen = addCards('genetica', 2);
    answer('henrique', '2026-10-01T15:00:00Z', [cito[0], cito[1], gen[0]], 'good');
    answer('henrique', '2026-10-01T15:01:00Z', [gen[1]], 'again');
    clock.set('2026-10-02T16:00:00Z');
    expect(thermometer(ctx, henrique).topics.map((t) => t.id)).toEqual(['genetica', 'citologia']);
    const soon = thermometer(ctx, henrique).topics.find((t) => t.id === 'citologia')!;
    clock.set('2027-02-01T15:00:00Z');
    const later = thermometer(ctx, henrique).topics.find((t) => t.id === 'citologia')!;
    expect(later.mastery as number).toBeLessThan(soon.mastery as number);
    expect(later.weak).toBe(true);
    expect(later).toMatchObject({ seen: 2, total: 2 });
  });

  it('counts a new card as unseen and leaves a suspended one out', () => {
    const cito = addCards('citologia', 3);
    answer('henrique', '2026-10-01T15:00:00Z', [cito[0]], 'good');
    setSuspended(ctx, 'henrique', cito[1], true);
    expect(thermometer(ctx, henrique).topics[0]).toMatchObject({ seen: 1, total: 2 });
  });

  it("keeps another member's personal cards and answers out of it", () => {
    addCards('citologia', 1);
    const personal = addCards('citologia', 2, 'pessoal', 'outro');
    answer('outro', '2026-10-01T15:00:00Z', personal, 'again');
    clock.set('2026-10-01T16:00:00Z');
    expect(thermometer(ctx, henrique).topics[0]).toMatchObject({ mastery: null, seen: 0, total: 1 });
    expect(thermometer(ctx, outro).topics[0]).toMatchObject({ seen: 2, total: 3 });
  });

  describe('long-term memory and saved cards', () => {
    it('is hidden under 20 answers, then the share right of cards not seen for 7+ days, in Revisão', () => {
      const ids = addCards('citologia', 25);
      answer('henrique', '2026-10-20T15:00:00Z', ids, 'good');
      answer('henrique', '2026-11-13T15:00:00Z', ids.slice(0, 19), 'good'); // gap 24 days, 19 answers
      expect(thermometer(ctx, henrique)).toMatchObject({ longTermRate: null, longTermAnswers: 19, savedCards: 19 });
      answer('henrique', '2026-11-13T16:00:00Z', ids.slice(19, 20), 'again'); // the 20th: wrong
      expect(thermometer(ctx, henrique)).toMatchObject({ longTermRate: 19 / 20, longTermAnswers: 20 });
    });

    it('ignores training sessions and answers older than 14 days', () => {
      const ids = addCards('citologia', 20);
      answer('henrique', '2026-09-01T15:00:00Z', ids, 'good');
      answer('henrique', '2026-10-10T15:00:00Z', ids, 'good'); // 14+ days before the 13th of November
      answer('henrique', '2026-11-13T15:00:00Z', ids, 'good', 'cram'); // Treino: does not count
      clock.set('2026-11-13T16:00:00Z');
      expect(thermometer(ctx, henrique)).toMatchObject({ longTermRate: null, longTermAnswers: 0 });
    });
  });

  it('reads the minilinha from the daily snapshots of the last 4 weeks', () => {
    const [card] = addCards('citologia', 1);
    answer('henrique', '2026-10-01T15:00:00Z', [card], 'good');
    recordSnapshot(ctx, 'henrique');
    clock.set('2026-10-20T15:00:00Z');
    recordSnapshot(ctx, 'henrique');
    clock.set('2026-10-30T15:00:00Z');
    const trend = thermometer(ctx, henrique).topics[0].trend;
    expect(trend.map((p) => p.day)).toEqual(['2026-10-20']); // the 1st is older than 28 days
    expect(thermometer(ctx, outro).topics[0].trend).toEqual([]);
  });
});

describe('worstCards', () => {
  it('groups by topic from the weakest, problem cards first, then from the lowest mastery', () => {
    const cito = addCards('citologia', 3);
    const gen = addCards('genetica', 1);
    answer('henrique', '2026-10-01T15:00:00Z', [cito[0], gen[0]], 'good');
    answer('henrique', '2026-10-01T15:05:00Z', [cito[1]], 'good');
    for (let i = 0; i < 6; i++) answer('henrique', `2026-10-01T16:0${i}:00Z`, [cito[2]], 'again');
    clock.set('2026-10-20T15:00:00Z');
    answer('henrique', '2026-10-20T15:00:00Z', [cito[1]], 'good'); // fresher than the others

    const result = worstCards(ctx, henrique, {}) as Exclude<ReturnType<typeof worstCards>, QueryError>;
    expect(result.map((g) => g.topicId).sort()).toEqual(['citologia', 'genetica']);
    const group = result.find((g) => g.topicId === 'citologia')!;
    expect(group.cards.map((c) => c.cardId)).toEqual([cito[2], cito[0], cito[1]]);
    expect(group.cards[0]).toMatchObject({ problem: true, againCount: 6, origin: 'system', lastSeenDay: '2026-10-01' });
    expect(group.cards[2]).toMatchObject({ problem: false, lastSeenDay: '2026-10-20' });
  });

  it('opens a single topic, lists only studied cards and fails on an unknown topic', () => {
    const cito = addCards('citologia', 2);
    addCards('genetica', 1);
    answer('henrique', '2026-10-01T15:00:00Z', [cito[0]], 'good');
    const result = worstCards(ctx, henrique, { topicId: 'citologia' }) as ReturnType<typeof thermometer>['topics'];
    expect(result).toHaveLength(1);
    expect((result as unknown as { cards: unknown[] }[])[0].cards).toHaveLength(1);
    expect(worstCards(ctx, henrique, { topicId: 'genetica' })).toEqual([]);
    expect(worstCards(ctx, henrique, { topicId: 'nada' })).toEqual(new QueryError('not_found'));
    expect(worstCards(ctx, henrique, { topicId: 3 })).toEqual(new QueryError('invalid'));
  });

  it("never shows another member's answers", () => {
    const cito = addCards('citologia', 1);
    answer('outro', '2026-10-01T15:00:00Z', cito, 'again');
    expect(worstCards(ctx, henrique, {})).toEqual([]);
  });
});

describe('daily snapshots', () => {
  it('start at the first answer, once a day, and refresh while he keeps answering', () => {
    const ids = addCards('citologia', 2);
    clock.set('2026-10-01T10:00:00Z');
    recordDueSnapshots(ctx);
    expect(ctx.sql.all('SELECT COUNT(*) AS n FROM daily_snapshots')).toEqual([{ n: 0 }]);

    answer('henrique', '2026-10-01T15:00:00Z', [ids[0]], 'good');
    recordDueSnapshots(ctx);
    answer('henrique', '2026-10-01T15:30:00Z', [ids[1]], 'good');
    recordDueSnapshots(ctx);
    expect(ctx.sql.all('SELECT member_id, day, long_term_rate, saved_cards FROM daily_snapshots')).toEqual([
      { member_id: 'henrique', day: '2026-10-01', long_term_rate: null, saved_cards: 0 },
    ]);
    expect(ctx.sql.all('SELECT topic_id, day FROM topic_snapshots')).toEqual([{ topic_id: 'citologia', day: '2026-10-01' }]);

    // The next day he did not answer: one snapshot, the old one stays.
    clock.set('2026-10-02T15:00:00Z');
    recordDueSnapshots(ctx);
    recordDueSnapshots(ctx);
    expect(ctx.sql.all('SELECT day FROM daily_snapshots ORDER BY day')).toEqual([{ day: '2026-10-01' }, { day: '2026-10-02' }]);
  });
});
