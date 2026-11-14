// How far away a card comes back, for the label under each answer button ("volta em 2 dias").
// The units are returned apart from the words: the words live in strings.ts.

export type IntervalUnit = 'minute' | 'hour' | 'day' | 'month';

export interface IntervalParts {
  readonly unit: IntervalUnit;
  readonly amount: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;

/** The interval rounded to the biggest unit that fits: 1 min at the least, whole days from 24 h. */
export function intervalParts(ms: number): IntervalParts {
  if (ms < HOUR) return { unit: 'minute', amount: Math.max(1, Math.round(ms / MINUTE)) };
  if (ms < DAY) return { unit: 'hour', amount: Math.round(ms / HOUR) };
  if (ms < MONTH) return { unit: 'day', amount: Math.round(ms / DAY) };
  return { unit: 'month', amount: Math.round(ms / MONTH) };
}
