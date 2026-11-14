import { describe, expect, it } from 'vitest';
import type { DiagnosticCard } from './diagnostic';
import { examSelection } from './exam';

const card = (cardId: string, topicId: string, mastery: number | null, suspended = false): DiagnosticCard => ({ cardId, topicId, mastery, suspended, againCount: 0 });

describe('examSelection', () => {
  const cards = [card('a', 't1', 0.9), card('b', 't1', null), card('c', 't2', 0.3), card('d', 't2', 0.5, true), card('e', 't3', 0.1)];

  it('takes every card of the chosen topics, new ones included, and counts seen and new', () => {
    expect(examSelection(cards, ['t1', 't2'], 'all')).toEqual({ cardIds: ['a', 'b', 'c'], seen: 2, fresh: 1 });
  });

  it('never takes suspended cards', () => {
    expect(examSelection(cards, ['t2'], 'all').cardIds).toEqual(['c']);
  });

  it('weakest takes only seen cards, lowest mastery first, at most 30', () => {
    expect(examSelection(cards, ['t1', 't2'], 'weakest').cardIds).toEqual(['c', 'a']);
    const many = Array.from({ length: 40 }, (_, i) => card(`x${i}`, 't1', i / 100));
    const picked = examSelection(many, ['t1'], 'weakest').cardIds;
    expect(picked).toHaveLength(30);
    expect(picked[0]).toBe('x0');
    expect(picked).not.toContain('x30');
  });

  it('returns nothing when no topic is chosen', () => {
    expect(examSelection(cards, [], 'all')).toEqual({ cardIds: [], seen: 0, fresh: 0 });
  });
});
