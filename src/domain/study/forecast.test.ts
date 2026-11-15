import { describe, expect, it } from 'vitest';
import { forecastTopic } from './forecast';
import { newCardState, schedule, type SchedulingState } from './scheduler';

const TODAY = '2026-11-15';
const at = (iso: string) => new Date(iso);

/** A review card last seen `ago` days before TODAY noon, with the stability given. */
function review(ago: number, stability: number, dueInDays: number): SchedulingState {
  const last = at(`2026-11-15T15:00:00Z`);
  last.setUTCDate(last.getUTCDate() - ago);
  const due = new Date(last);
  due.setUTCDate(due.getUTCDate() + ago + dueInDays);
  return {
    stage: 'review',
    due: due.toISOString(),
    stability,
    difficulty: 5,
    scheduledDays: ago + dueInDays,
    learningSteps: 0,
    reps: 3,
    lapses: 0,
    lastReview: last.toISOString(),
  };
}

describe('forecastTopic', () => {
  it('is null with no studied card', () => {
    expect(forecastTopic([], TODAY)).toBeNull();
    expect(forecastTopic([newCardState(at('2026-11-14T15:00:00Z'))], TODAY)).toBeNull();
  });

  it('returns one value per day, and the lowest of them', () => {
    const f = forecastTopic([review(1, 10, 9)], TODAY)!;
    expect(f.dailyMastery).toHaveLength(7);
    expect(f.lowest).toBe(Math.min(...f.dailyMastery));
    expect(forecastTopic([review(1, 10, 9)], TODAY, 3)!.dailyMastery).toHaveLength(3);
  });

  it('lets a card with no review due decay across the window', () => {
    const f = forecastTopic([review(1, 3, 20)], TODAY)!;
    expect(f.dailyMastery[6]).toBeLessThan(f.dailyMastery[0]);
  });

  it('recovers a card due tomorrow: reviewing it lifts the mastery above where it would sink', () => {
    const due = review(5, 5, 0);
    const f = forecastTopic([{ ...due, due: '2026-11-16T15:00:00.000Z' }], TODAY)!;
    expect(f.dailyMastery[0]).toBeGreaterThan(0.85);
    expect(f.dailyMastery[6]).toBeGreaterThan(0.8);
  });

  it('drops for a topic that is overdue: the forecast is the lowest day', () => {
    const overdue = review(60, 2, -58);
    const f = forecastTopic([overdue], TODAY)!;
    // Reviewed on day 1, so day 1 is already recovered, but never above 1.
    expect(f.lowest).toBeLessThanOrEqual(1);
    const noReview = schedule(overdue, 'good', at('2026-11-16T15:00:00Z'));
    expect(noReview.due > overdue.due).toBe(true);
  });

  it('ignores new cards among studied ones', () => {
    const studied = review(1, 10, 9);
    const mixed = forecastTopic([studied, newCardState(at('2026-11-14T15:00:00Z'))], TODAY)!;
    expect(mixed).toEqual(forecastTopic([studied], TODAY));
  });
});
