import { describe, expect, it } from 'vitest';
import { intervalParts } from './interval-label';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('intervalParts', () => {
  it('never says less than 1 minute', () => {
    expect(intervalParts(0)).toEqual({ unit: 'minute', amount: 1 });
    expect(intervalParts(20_000)).toEqual({ unit: 'minute', amount: 1 });
  });

  it('counts minutes up to the hour, then hours up to the day', () => {
    expect(intervalParts(10 * MIN)).toEqual({ unit: 'minute', amount: 10 });
    expect(intervalParts(3 * HOUR)).toEqual({ unit: 'hour', amount: 3 });
  });

  it('counts days up to a month, then months', () => {
    expect(intervalParts(DAY)).toEqual({ unit: 'day', amount: 1 });
    expect(intervalParts(5 * DAY)).toEqual({ unit: 'day', amount: 5 });
    expect(intervalParts(65 * DAY)).toEqual({ unit: 'month', amount: 2 });
  });
});
