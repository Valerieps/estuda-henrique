import { describe, expect, it } from 'vitest';
import { topicState } from './topic-state';

describe('topicState', () => {
  it('is new while no card was seen or there is no mastery yet', () => {
    expect(topicState(null, 0)).toBe('new');
    expect(topicState(null, 3)).toBe('new');
    expect(topicState(0.95, 0)).toBe('new');
  });

  it('is weak under 60%', () => {
    expect(topicState(0, 1)).toBe('weak');
    expect(topicState(0.59, 5)).toBe('weak');
  });

  it('is in progress from 60% up to, not including, 90%', () => {
    expect(topicState(0.6, 5)).toBe('progress');
    expect(topicState(0.89, 5)).toBe('progress');
  });

  it('is mastered from 90%', () => {
    expect(topicState(0.9, 5)).toBe('mastered');
    expect(topicState(1, 5)).toBe('mastered');
  });
});
