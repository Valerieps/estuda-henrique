import { describe, expect, it } from 'vitest';
import { computeStreak, streakCalendar, CALENDAR_DAYS } from './streak';

// 2026-11-13 is a Friday. 2026-11-08 is a Sunday.
const days = (...list: string[]) => new Set(list);

describe('computeStreak', () => {
  it('is zero for someone who never studied', () => {
    expect(computeStreak(days(), [], '2026-11-13')).toEqual({ days: 0, litToday: false, repairableDay: null });
  });

  it('counts consecutive days and lights the flame when today counted', () => {
    expect(computeStreak(days('2026-11-11', '2026-11-12', '2026-11-13'), [], '2026-11-13')).toMatchObject({ days: 3, litToday: true });
  });

  it('keeps the streak alive while today is still open', () => {
    expect(computeStreak(days('2026-11-11', '2026-11-12'), [], '2026-11-13')).toMatchObject({ days: 2, litToday: false });
  });

  it('does not break on a rest day, and counts one he studied on', () => {
    const studied = days('2026-11-06', '2026-11-07', '2026-11-09', '2026-11-10');
    expect(computeStreak(studied, [0], '2026-11-10').days).toBe(4);
    expect(computeStreak(days('2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'), [0], '2026-11-09').days).toBe(4);
  });

  it('offers to fix a single missed day after a streak', () => {
    const result = computeStreak(days('2026-11-09', '2026-11-10', '2026-11-12', '2026-11-13'), [], '2026-11-13');
    expect(result).toEqual({ days: 2, litToday: true, repairableDay: '2026-11-11' });
  });

  it('offers to fix yesterday when today is still open', () => {
    expect(computeStreak(days('2026-11-09', '2026-11-10'), [], '2026-11-12')).toMatchObject({ days: 0, repairableDay: '2026-11-11' });
  });

  it('offers nothing when more than one day was lost', () => {
    expect(computeStreak(days('2026-11-08', '2026-11-09'), [], '2026-11-13').repairableDay).toBeNull();
  });

  it('looks past rest days before the missed day', () => {
    // Sunday 8th rests; he studied Sat 7th, missed Mon 9th, and is on Tue 10th.
    expect(computeStreak(days('2026-11-07', '2026-11-10'), [0], '2026-11-10').repairableDay).toBe('2026-11-09');
  });
});

describe('streakCalendar', () => {
  it('lists the last days, oldest first, marking counted and rest days', () => {
    const calendar = streakCalendar(days('2026-11-13'), [0], '2026-11-13');
    expect(calendar).toHaveLength(CALENDAR_DAYS);
    expect(calendar.at(-1)).toEqual({ day: '2026-11-13', counted: true, rest: false });
    expect(calendar.find((d) => d.day === '2026-11-08')).toEqual({ day: '2026-11-08', counted: false, rest: true });
  });
});
