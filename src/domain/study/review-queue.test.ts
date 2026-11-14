import { describe, expect, it } from 'vitest';
import { AGAIN_GAP, afterAnswer, returnDelays } from './review-queue';
import { newCardState } from './scheduler';

const NOW = new Date('2026-11-13T15:00:00Z');
const card = (id: string) => ({ id, state: newCardState(NOW) });
const ids = (queue: readonly { id: string }[]) => queue.map((c) => c.id);

describe('afterAnswer', () => {
  const queue = ['a', 'b', 'c', 'd', 'e', 'f'].map(card);

  it('takes Acertei and Acertei com esforço out of the session', () => {
    expect(ids(afterAnswer(queue, 'good', NOW))).toEqual(['b', 'c', 'd', 'e', 'f']);
    expect(ids(afterAnswer(queue, 'hard', NOW))).toEqual(['b', 'c', 'd', 'e', 'f']);
  });

  it('sends Errei back after a few cards, learning again', () => {
    const next = afterAnswer(queue, 'again', NOW);
    expect(ids(next)).toEqual(['b', 'c', 'd', 'a', 'e', 'f']);
    expect(next[AGAIN_GAP].state).toMatchObject({ stage: 'learning', reps: 1 });
  });

  it('brings Errei back right away when it was the last card', () => {
    expect(ids(afterAnswer([card('a')], 'again', NOW))).toEqual(['a']);
    expect(ids(afterAnswer([card('a'), card('b')], 'again', NOW))).toEqual(['b', 'a']);
    expect(afterAnswer([card('a')], 'good', NOW)).toEqual([]);
  });

  it('does nothing to an empty queue', () => {
    expect(afterAnswer([], 'again', NOW)).toEqual([]);
  });
});

describe('returnDelays', () => {
  it('gives the three buttons their own delay: Errei in minutes, the others later or equal', () => {
    const delays = returnDelays(newCardState(NOW), NOW);
    expect(delays.again).toBe(60_000);
    expect(delays.hard).toBeGreaterThan(delays.again);
    expect(delays.good).toBeGreaterThanOrEqual(delays.hard);
  });
});
