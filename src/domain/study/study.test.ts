import { describe, expect, it } from 'vitest';
import { cardIndexes, clozeCard, clozePassages, unmark } from './cloze';
import { isAnswer, isCorrect, newCardState, retrievability, schedule, type SchedulingState } from './scheduler';
import { addDays, endOfStudyDay, isStudyDay, studyDay, weekday, weekStart } from './study-day';

describe('study day', () => {
  it('turns at midnight in Brasília, not in UTC', () => {
    expect(studyDay(new Date('2026-11-14T02:59:00Z'))).toBe('2026-11-13');
    expect(studyDay(new Date('2026-11-14T03:00:00Z'))).toBe('2026-11-14');
  });

  it('ends at the next midnight in Brasília', () => {
    expect(endOfStudyDay(new Date('2026-11-13T15:00:00Z')).toISOString()).toBe('2026-11-14T03:00:00.000Z');
    expect(endOfStudyDay(new Date('2026-11-14T02:59:00Z')).toISOString()).toBe('2026-11-14T03:00:00.000Z');
  });

  it('follows the old summer time too', () => {
    // 2018-12-01 was in Brasília summer time (UTC-2).
    expect(studyDay(new Date('2018-12-01T02:30:00Z'))).toBe('2018-12-01');
    expect(endOfStudyDay(new Date('2018-12-01T12:00:00Z')).toISOString()).toBe('2018-12-02T02:00:00.000Z');
  });

  it('does calendar arithmetic across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekday('2026-11-15')).toBe(0);
    expect(weekStart('2026-11-15')).toBe('2026-11-09');
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
  });

  it('recognizes valid days only', () => {
    expect(isStudyDay('2026-11-13')).toBe(true);
    expect(isStudyDay('2026-02-30')).toBe(false);
    expect(isStudyDay('13/11/2026')).toBe(false);
    expect(isStudyDay(20261113)).toBe(false);
  });
});

describe('scheduler', () => {
  const now = new Date('2026-11-13T15:00:00Z');
  const minutes = (state: SchedulingState) => (new Date(state.due).getTime() - now.getTime()) / 60_000;

  it('accepts only the three buttons, and Errei is the only wrong one', () => {
    expect(['again', 'hard', 'good', 'easy'].map(isAnswer)).toEqual([true, true, true, false]);
    expect(isCorrect('again')).toBe(false);
    expect(isCorrect('hard')).toBe(true);
    expect(isCorrect('good')).toBe(true);
  });

  it('starts a new card due now', () => {
    const state = newCardState(now);
    expect(state).toMatchObject({ stage: 'new', due: now.toISOString(), reps: 0, lapses: 0, lastReview: null });
    expect(retrievability(state, now)).toBe(0);
  });

  it('brings a missed new card back in a minute, in the same session', () => {
    const state = schedule(newCardState(now), 'again', now);
    expect(state.stage).toBe('learning');
    expect(minutes(state)).toBe(1);
  });

  it('steps through 1 and 10 minutes, then graduates to days', () => {
    const first = schedule(newCardState(now), 'good', now);
    expect(first.stage).toBe('learning');
    expect(minutes(first)).toBe(10);
    const later = new Date(first.due);
    const graduated = schedule(first, 'good', later);
    expect(graduated.stage).toBe('review');
    expect(graduated.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it('sends a forgotten review card to relearning and counts the lapse', () => {
    let state = schedule(newCardState(now), 'good', now);
    state = schedule(state, 'good', new Date(state.due));
    const reviewDay = new Date(state.due);
    const forgotten = schedule(state, 'again', reviewDay);
    expect(forgotten).toMatchObject({ stage: 'relearning', lapses: 1 });
    expect(retrievability(state, reviewDay)).toBeGreaterThan(0);
  });

  it('is deterministic: the same answer at the same time gives the same state', () => {
    const state = schedule(newCardState(now), 'hard', now);
    expect(schedule(newCardState(now), 'hard', now)).toEqual(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe('cloze', () => {
  const sentence = 'A {{mitocôndria}} realiza a {{ respiração celular }}{{ }}.';

  it('makes one card per marked passage, and one for a basic note', () => {
    expect(clozePassages(sentence)).toEqual(['mitocôndria', 'respiração celular']);
    expect(cardIndexes('cloze', sentence)).toEqual([1, 2]);
    expect(cardIndexes('basic', 'O que é ATP?')).toEqual([0]);
    expect(cardIndexes('cloze', 'sem lacunas')).toEqual([]);
  });

  it('hides one passage and shows the others', () => {
    expect(clozeCard(sentence, 1)).toEqual({ before: 'A ', hidden: 'mitocôndria', after: ' realiza a respiração celular.' });
    expect(clozeCard(sentence, 2)).toEqual({ before: 'A mitocôndria realiza a ', hidden: 'respiração celular', after: '.' });
    expect(clozeCard(sentence, 3)).toBeNull();
    expect(unmark(sentence)).toBe('A mitocôndria realiza a respiração celular.');
  });
});
