import { describe, expect, it } from 'vitest';
import { arrangeTopics, countByState } from './topic-list';

const topics = [
  { id: 'a', state: 'mastered', mastery: 0.95 },
  { id: 'b', state: 'new', mastery: null },
  { id: 'c', state: 'weak', mastery: 0.4 },
  { id: 'd', state: 'progress', mastery: 0.7 },
  { id: 'e', state: 'weak', mastery: 0.4 },
] as const;

describe('arrangeTopics', () => {
  it('keeps the course order when asked', () => {
    expect(arrangeTopics(topics, 'all', 'course').map((t) => t.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('puts the weakest first, then progress, new and mastered, ties in course order', () => {
    expect(arrangeTopics(topics, 'all', 'weakest').map((t) => t.id)).toEqual(['c', 'e', 'd', 'b', 'a']);
  });

  it('reorders even when most topics are new', () => {
    const mostlyNew = [
      { id: 'x', state: 'new', mastery: null },
      { id: 'y', state: 'new', mastery: null },
      { id: 'z', state: 'weak', mastery: 0.3 },
    ] as const;
    expect(arrangeTopics(mostlyNew, 'all', 'weakest').map((t) => t.id)).toEqual(['z', 'x', 'y']);
  });

  it('shows only the topics in the chosen state', () => {
    expect(arrangeTopics(topics, 'weak', 'course').map((t) => t.id)).toEqual(['c', 'e']);
    expect(arrangeTopics(topics, 'mastered', 'weakest').map((t) => t.id)).toEqual(['a']);
  });

  it('does not change the list it was given', () => {
    const copy = [...topics];
    arrangeTopics(topics, 'all', 'weakest');
    expect(topics).toEqual(copy);
  });
});

describe('countByState', () => {
  it('counts the topics in each state', () => {
    expect(countByState(topics)).toEqual({ new: 1, weak: 2, progress: 1, mastered: 1 });
  });
});
