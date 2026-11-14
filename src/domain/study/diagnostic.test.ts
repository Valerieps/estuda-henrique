import { describe, expect, it } from 'vitest';
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
  type RecallEvent,
} from './diagnostic';

const card = (cardId: string, mastery: number | null, extra: Partial<DiagnosticCard> = {}): DiagnosticCard => ({
  cardId,
  topicId: 't',
  mastery,
  suspended: false,
  againCount: 0,
  ...extra,
});

describe('topic mastery and coverage', () => {
  it('averages the studied cards and ignores the new ones', () => {
    expect(topicMastery([card('a', 0.9), card('b', 0.5), card('c', null)])).toBeCloseTo(0.7);
  });

  it('is null, never 0, when nothing was studied', () => {
    expect(topicMastery([])).toBeNull();
    expect(topicMastery([card('a', null)])).toBeNull();
  });

  it('leaves suspended cards out of the mastery and the coverage', () => {
    const cards = [card('a', 0.9), card('b', 0.1, { suspended: true }), card('c', null)];
    expect(topicMastery(cards)).toBeCloseTo(0.9);
    expect(topicCoverage(cards)).toEqual({ seen: 1, total: 2 });
  });

  it('highlights below 60% only', () => {
    expect(isWeak(0.59)).toBe(true);
    expect(isWeak(0.6)).toBe(false);
    expect(isWeak(null)).toBe(false);
  });
});

describe('problem cards', () => {
  it('starts at six Errei', () => {
    expect(isProblemCard(5)).toBe(false);
    expect(isProblemCard(6)).toBe(true);
  });
});

describe('ordering', () => {
  it('ranks topics from the weakest, those with no mastery last', () => {
    const topics = [
      { id: 'a', mastery: 0.8 },
      { id: 'b', mastery: null },
      { id: 'c', mastery: 0.4 },
      { id: 'd', mastery: null },
    ];
    expect(rankTopics(topics).map((t) => t.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('lists problem cards first, then the rest, each from the lowest mastery', () => {
    const cards = [
      card('ok-low', 0.3),
      card('problem-high', 0.9, { againCount: 6 }),
      card('ok-high', 0.8),
      card('problem-low', 0.5, { againCount: 7 }),
      card('new', null),
      card('suspended', 0.1, { suspended: true }),
    ];
    expect(orderWorstCards(cards).map((c) => c.cardId)).toEqual(['problem-low', 'problem-high', 'ok-low', 'ok-high']);
  });
});

const answer = (cardId: string, day: string, rating: AnswerRecord['answer'] = 'good', training = false): AnswerRecord => ({
  cardId,
  answer: rating,
  day,
  training,
});

describe('recall events', () => {
  it('skips the first answer of a card and measures the gap in study days', () => {
    const events = recallEvents([answer('a', '2026-11-01'), answer('a', '2026-11-09', 'again'), answer('a', '2026-11-09', 'good')]);
    expect(events).toEqual([
      { cardId: 'a', day: '2026-11-09', gapDays: 8, correct: false, training: false },
      { cardId: 'a', day: '2026-11-09', gapDays: 0, correct: true, training: false },
    ]);
  });

  it('counts the gap from any earlier answer, training included', () => {
    const events = recallEvents([answer('a', '2026-11-01'), answer('a', '2026-11-08', 'good', true), answer('a', '2026-11-10')]);
    expect(events.map((e) => e.gapDays)).toEqual([7, 2]);
  });
});

const event = (day: string, gapDays: number, correct = true, training = false): RecallEvent => ({ cardId: 'a', day, gapDays, correct, training });

describe('long-term memory', () => {
  const today = '2026-11-20';
  const many = (n: number, correct: number, day = '2026-11-15') =>
    Array.from({ length: n }, (_, i) => event(day, 7 + i, i < correct));

  it('stays hidden under 20 answers', () => {
    expect(longTermMemory(many(19, 19), today)).toEqual({ answers: 19, rate: null });
  });

  it('is the share right once there are 20', () => {
    expect(longTermMemory(many(20, 18), today)).toEqual({ answers: 20, rate: 0.9 });
  });

  it('counts only cards not seen for 7 days, answered in the last 14 days, in Revisão', () => {
    const events = [
      ...many(20, 20),
      event(today, 6), // seen too recently
      event('2026-11-06', 10), // 14 days ago is the 7th: out of the window
      event('2026-11-07', 10, false), // first day of the window
      event(today, 10, false, true), // training
    ];
    const memory = longTermMemory(events, today);
    expect(memory.answers).toBe(21);
    expect(memory.rate).toBeCloseTo(20 / 21);
  });
});

describe('saved cards', () => {
  it('counts each card once, after 21 days or more, answered right, in any session', () => {
    const events: RecallEvent[] = [
      { cardId: 'a', day: '2026-11-01', gapDays: 21, correct: true, training: false },
      { cardId: 'a', day: '2026-11-20', gapDays: 40, correct: true, training: false },
      { cardId: 'b', day: '2026-11-01', gapDays: 20, correct: true, training: false },
      { cardId: 'c', day: '2026-11-01', gapDays: 30, correct: false, training: false },
      { cardId: 'd', day: '2026-11-01', gapDays: 30, correct: true, training: true },
    ];
    expect(savedCards(events)).toBe(2);
  });
});
