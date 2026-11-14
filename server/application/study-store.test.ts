import { beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, emptyDeckSql, sequentialIds } from '../testing/node-sql';
import type { Context } from './context';
import { MIGRATIONS, migrate } from './schema';
import {
  cardState,
  endStudySession,
  recordAnswer,
  saveStudySettings,
  setSuspended,
  startStudySession,
  studySettings,
  undoLastAnswer,
} from './study-store';

let clock: ReturnType<typeof fixedClock>;
let ctx: Context;

beforeEach(() => {
  clock = fixedClock('2026-11-14T02:30:00Z'); // still the 13th in Brasília
  ctx = { sql: emptyDeckSql(), clock, ids: sequentialIds() };
  migrate(ctx.sql);
  for (const id of ['henrique', 'outro']) {
    ctx.sql.run("INSERT INTO members (id, email, name, joined_at) VALUES (?, ?, ?, '2026-11-01')", id, `${id}@example.com`, id);
  }
  ctx.sql.run("INSERT INTO topics (id, subject_id, name, position, created_at) VALUES ('citologia', 'biologia', 'Citologia', 0, '2026-11-01')");
  ctx.sql.run(
    "INSERT INTO notes (id, topic_id, kind, front, back, created_at, updated_at) VALUES ('n1', 'citologia', 'basic', 'O que é ATP?', 'Energia', '2026-11-01', '2026-11-01')",
  );
  ctx.sql.run("INSERT INTO cards (id, note_id, cloze_index) VALUES ('c1', 'n1', 0)");
});

describe('schema', () => {
  it('migrates once, to the last version, with Biologia as the first subject', () => {
    migrate(ctx.sql);
    expect(ctx.sql.all('SELECT MAX(version) AS v FROM schema_migrations')).toEqual([{ v: MIGRATIONS.length }]);
    expect(ctx.sql.all('SELECT id, name FROM subjects')).toEqual([{ id: 'biologia', name: 'Biologia' }]);
  });

  it('rejects ratings and note kinds the app does not have', () => {
    const session = startStudySession(ctx, 'henrique', 'review');
    expect(() =>
      ctx.sql.run(
        "INSERT INTO reviews (id, member_id, card_id, session_id, rating, reviewed_at, study_day, is_training) VALUES ('r', 'henrique', 'c1', ?, 'easy', 'x', 'x', 0)",
        session,
      ),
    ).toThrow();
    expect(() =>
      ctx.sql.run("INSERT INTO notes (id, topic_id, kind, front, created_at, updated_at) VALUES ('n2', 'citologia', 'image', 'x', 'x', 'x')"),
    ).toThrow();
  });
});

describe('card states', () => {
  it('treats a card never answered as new and due now', () => {
    expect(cardState(ctx, 'henrique', 'c1')).toMatchObject({ state: { stage: 'new', due: '2026-11-14T02:30:00.000Z' }, suspended: false });
  });

  it('keeps one state per member', () => {
    const session = startStudySession(ctx, 'henrique', 'review');
    recordAnswer(ctx, 'henrique', session, 'c1', 'good');
    setSuspended(ctx, 'henrique', 'c1', true);
    expect(cardState(ctx, 'henrique', 'c1')).toMatchObject({ state: { stage: 'learning', reps: 1 }, suspended: true });
    expect(cardState(ctx, 'outro', 'c1')).toMatchObject({ state: { stage: 'new', reps: 0 }, suspended: false });
  });
});

describe('answers', () => {
  it('records the answer on the study day in Brasília, marking training sessions', () => {
    const review = startStudySession(ctx, 'henrique', 'review');
    const cram = startStudySession(ctx, 'henrique', 'cram');
    recordAnswer(ctx, 'henrique', review, 'c1', 'again');
    recordAnswer(ctx, 'henrique', cram, 'c1', 'hard');
    expect(ctx.sql.all('SELECT rating, study_day, is_training FROM reviews ORDER BY rowid')).toEqual([
      { rating: 'again', study_day: '2026-11-13', is_training: 0 },
      { rating: 'hard', study_day: '2026-11-13', is_training: 1 },
    ]);
  });

  it('undoes the last answer of the session and restores the previous state', () => {
    const session = startStudySession(ctx, 'henrique', 'review');
    recordAnswer(ctx, 'henrique', session, 'c1', 'good');
    const afterFirst = cardState(ctx, 'henrique', 'c1');
    clock.set('2026-11-14T02:45:00Z');
    recordAnswer(ctx, 'henrique', session, 'c1', 'again');
    expect(undoLastAnswer(ctx, 'henrique', session)).toMatchObject({ cardId: 'c1', state: afterFirst.state });
    expect(cardState(ctx, 'henrique', 'c1')).toEqual(afterFirst);
    expect(ctx.sql.all('SELECT rating FROM reviews')).toEqual([{ rating: 'good' }]);
  });

  it("never touches another member's session, nor an ended one", () => {
    const session = startStudySession(ctx, 'henrique', 'review');
    expect(recordAnswer(ctx, 'outro', session, 'c1', 'good')).toBeNull();
    recordAnswer(ctx, 'henrique', session, 'c1', 'good');
    expect(undoLastAnswer(ctx, 'outro', session)).toBeNull();
    endStudySession(ctx, 'henrique', session);
    expect(recordAnswer(ctx, 'henrique', session, 'c1', 'good')).toBeNull();
    expect(undoLastAnswer(ctx, 'henrique', session)).toBeNull();
    expect(ctx.sql.all('SELECT COUNT(*) AS n FROM reviews')).toEqual([{ n: 1 }]);
  });
});

describe('settings', () => {
  it('starts with 10 new cards a day and stores changes per member', () => {
    expect(studySettings(ctx, 'henrique')).toMatchObject({ newPerDay: 20, restDays: [] });
    saveStudySettings(ctx, 'henrique', { ...studySettings(ctx, 'henrique'), newPerDay: 15, restDays: [0, 7, 0, 6] });
    expect(studySettings(ctx, 'henrique')).toMatchObject({ newPerDay: 15, restDays: [0, 6] });
    expect(studySettings(ctx, 'outro').newPerDay).toBe(20);
  });
});
