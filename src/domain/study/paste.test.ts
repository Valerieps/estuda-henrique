import { describe, expect, it } from 'vitest';
import { parseLine, parsePasted, replaceLine } from './paste';

describe('parseLine', () => {
  it('reads a basic card with and without a hint', () => {
    expect(parseLine('O que é Fungi ; Reino dos fungos')).toEqual({ kind: 'basic', front: 'O que é Fungi', back: 'Reino dos fungos', hint: null });
    expect(parseLine('A ; B ; C')).toEqual({ kind: 'basic', front: 'A', back: 'B', hint: 'C' });
  });
  it('reads a sentence with gaps as a cloze, even with a semicolon', () => {
    expect(parseLine('A {{mitocôndria}} faz respiração; sim')?.kind).toBe('cloze');
  });
  it('rejects lines without an answer or with too many parts', () => {
    expect(parseLine('só uma frase')).toBeNull();
    expect(parseLine('A ;')).toBeNull();
    expect(parseLine('; B')).toBeNull();
    expect(parseLine('A ; B ; C ; D')).toBeNull();
    expect(parseLine('A {{}} B')).toBeNull();
  });
});

describe('parsePasted', () => {
  it('skips blank lines, keeps original indexes and counts gaps as cards', () => {
    const lines = parsePasted('A ; B\n\nA {{x}} e {{y}}\nlixo');
    expect(lines.map((l) => [l.index, l.cards])).toEqual([[0, 1], [2, 2], [3, 0]]);
    expect(lines[1].note?.kind).toBe('cloze');
    expect(lines[2].note).toBeNull();
  });
  it('handles Windows line breaks', () => {
    expect(parsePasted('A ; B\r\nC ; D')).toHaveLength(2);
  });
});

describe('replaceLine', () => {
  it('changes only that line', () => {
    expect(replaceLine('a\n\nb', 2, 'c ; d')).toBe('a\n\nc ; d');
  });
});
