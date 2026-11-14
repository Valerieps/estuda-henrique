import { beforeEach, describe, expect, it } from 'vitest';
import type { StudyOutlook, StudySessionView, StudySummary } from '../../src/application/api-contract';
import { fixedClock, emptyDeckSql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';

let clock: ReturnType<typeof fixedClock>;
let service: GroupService;
let topicId: string;

const profile = (email: string) => ({ sub: `sub:${email}`, email, name: email.split('@')[0], picture: null });

function ok<T>(result: { ok: boolean; value?: unknown; error?: string }): T {
  expect(result).toMatchObject({ ok: true });
  return (result as { value: T }).value;
}

beforeEach(() => {
  clock = fixedClock('2026-11-13T15:00:00Z');
  service = new GroupService(emptyDeckSql(), clock, sequentialIds());
  service.migrate();
  service.signIn(profile('ana@example.com'), 'h-ana', ['ana@example.com']);
  for (const who of ['henrique', 'bia']) {
    service.command('h-ana', 'invite.create', { email: `${who}@example.com` });
    service.signIn(profile(`${who}@example.com`), `h-${who}`, []);
  }
  const [subject] = ok<{ topics: { id: string }[] }[]>(service.query('h-ana', 'subjects', {}));
  topicId = subject.topics[0]?.id ?? ok<{ id: string }>(service.command('h-ana', 'topic.create', { subjectId: 'biologia', name: 'Citologia' })).id;
});

function systemCards(count: number, topic = topicId): string[] {
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    const note = ok<{ cards: { id: string }[] }>(service.command('h-ana', 'note.create', { topicId: topic, kind: 'basic', front: `P${i}`, back: `R${i}` }));
    ids.push(note.cards[0].id);
  }
  return ids;
}

const start = (who: string, input: Record<string, unknown> = { kind: 'review' }) => ok<StudySessionView | null>(service.command(`h-${who}`, 'study.start', input));
const answer = (who: string, sessionId: string, cardId: string, rating: string) => service.command(`h-${who}`, 'study.answer', { sessionId, cardId, answer: rating });
const summary = (who: string, sessionId: string) => ok<StudySummary>(service.query(`h-${who}`, 'studySummary', { sessionId }));
const outlook = (who: string) => ok<StudyOutlook>(service.query(`h-${who}`, 'studyOutlook', {}));

describe('the Resumo', () => {
  it('counts buttons, the first answer of each card, new cards and the wrong cards', () => {
    const ids = systemCards(5);
    const session = start('henrique')!;
    answer('henrique', session.sessionId, ids[0], 'good');
    answer('henrique', session.sessionId, ids[1], 'again');
    answer('henrique', session.sessionId, ids[1], 'good'); // the repeat does not inflate accuracy
    answer('henrique', session.sessionId, ids[2], 'hard');
    answer('henrique', session.sessionId, ids[3], 'again');
    clock.set('2026-11-13T15:05:00Z');
    const result = summary('henrique', session.sessionId);
    expect(result).toMatchObject({ kind: 'review', training: false, answers: 5, counts: { again: 2, hard: 1, good: 2 }, newSeen: 4 });
    expect(result.accuracy).toBeCloseTo(2 / 4);
    expect(result.wrong.map((c) => c.front)).toEqual(['P2', 'P4']);
    expect(result.retryCardIds).toEqual([ids[1], ids[2], ids[3]]);
    expect(result.remainingToday).toBeGreaterThan(0);
    expect(result.longTermRate).toBeNull();
  });

  it('times the session from its start to its last answer', () => {
    const [card] = systemCards(1);
    const session = start('henrique')!;
    clock.set('2026-11-13T15:04:00Z');
    answer('henrique', session.sessionId, card, 'good');
    clock.set('2026-11-13T16:00:00Z');
    expect(summary('henrique', session.sessionId)).toMatchObject({ sessionSeconds: 240, daySeconds: 240, hourReached: false });
  });

  it('says 1h once: in the session where the day crosses an hour', () => {
    const [a, b] = systemCards(2);
    const first = start('henrique')!;
    clock.set('2026-11-13T15:50:00Z');
    answer('henrique', first.sessionId, a, 'good');
    service.command('h-henrique', 'study.end', { sessionId: first.sessionId });
    const second = start('henrique', { kind: 'cram', cardIds: [a, b] })!;
    clock.set('2026-11-13T16:10:00Z');
    answer('henrique', second.sessionId, b, 'good');
    expect(summary('henrique', first.sessionId).hourReached).toBe(false);
    expect(summary('henrique', second.sessionId)).toMatchObject({ hourReached: true, training: true });
    // A third session after the hour is already past does not repeat it.
    const third = start('henrique', { kind: 'cram', cardIds: [a] })!;
    clock.set('2026-11-13T16:12:00Z');
    answer('henrique', third.sessionId, a, 'good');
    expect(summary('henrique', third.sessionId).hourReached).toBe(false);
  });

  it('counts a card right after 7 days or more as recalled, and shows the topics that moved', () => {
    const ids = systemCards(2);
    const first = start('henrique')!;
    for (const id of ids) answer('henrique', first.sessionId, id, 'good');
    service.command('h-henrique', 'study.end', { sessionId: first.sessionId });
    clock.set('2026-11-25T15:00:00Z');
    const second = start('henrique', { kind: 'selected', cardIds: ids })!;
    answer('henrique', second.sessionId, ids[0], 'good');
    answer('henrique', second.sessionId, ids[1], 'again');
    const result = summary('henrique', second.sessionId);
    expect(result.recalled).toBe(1);
    expect(result.newSeen).toBe(0);
    expect(result.topics).toHaveLength(1);
    expect(result.topics[0]).toMatchObject({ topicId });
    expect(result.topics[0].before).not.toBeNull();
  });

  it('shows a topic that was never studied as starting from nothing', () => {
    const [card] = systemCards(1);
    const session = start('henrique')!;
    answer('henrique', session.sessionId, card, 'good');
    expect(summary('henrique', session.sessionId).topics).toMatchObject([{ topicId, before: null }]);
  });

  it('is empty for a session with no answers, and private to its owner', () => {
    systemCards(2);
    const session = start('henrique')!;
    expect(summary('henrique', session.sessionId)).toMatchObject({ answers: 0, accuracy: null, wrong: [], topics: [] });
    expect(service.query('h-bia', 'studySummary', { sessionId: session.sessionId })).toMatchObject({ ok: false, error: 'not_found' });
    expect(service.query('h-ana', 'studySummary', { sessionId: session.sessionId })).toMatchObject({ ok: false, error: 'not_found' });
    expect(service.query('h-henrique', 'studySummary', {})).toMatchObject({ ok: false, error: 'invalid' });
  });

  it('gives the long-term memory only when the day is done', () => {
    const [card] = systemCards(1);
    const session = start('henrique')!;
    answer('henrique', session.sessionId, card, 'good');
    answer('henrique', session.sessionId, card, 'good');
    // Both learning steps done: nothing left today.
    expect(summary('henrique', session.sessionId).remainingToday).toBe(0);
  });
});

describe('Mais 5? and Adiantar novas', () => {
  it('lists what is left today and the topic with the fewest cards seen', () => {
    const other = ok<{ id: string }>(service.command('h-ana', 'topic.create', { subjectId: 'biologia', name: 'Genética' })).id;
    const a = systemCards(3);
    systemCards(3, other);
    const session = start('henrique', { kind: 'review', limit: 1 })!;
    answer('henrique', session.sessionId, a[0], 'good');
    const result = outlook('henrique');
    expect(result.remainingToday).toBe(6);
    expect(result.aheadTopics.map((t) => [t.name, t.seen, t.newLeft])).toEqual([
      ['Citologia', 1, 2],
      ['Genética', 0, 3],
    ]);
    expect(result.suggestedTopicId).toBe(other);
  });

  it('brings 10 new cards of the chosen topic past the daily limit, as a normal review', () => {
    systemCards(25);
    const day = start('henrique')!;
    expect(day.cards).toHaveLength(20);
    for (const card of day.cards) answer('henrique', day.sessionId, card.id, 'good');
    const ahead = start('henrique', { kind: 'review', aheadTopicId: topicId })!;
    expect(ahead).toMatchObject({ kind: 'review', training: false });
    expect(ahead.cards).toHaveLength(5);
    expect(ahead.cards.every((c) => c.state.stage === 'new')).toBe(true);
    systemCards(10);
    expect(start('henrique', { kind: 'review', aheadTopicId: topicId })!.cards).toHaveLength(10);
  });

  it('rejects a bad ahead request, and returns nothing for an unknown topic', () => {
    systemCards(1);
    expect(service.command('h-henrique', 'study.start', { kind: 'review', aheadTopicId: 7 })).toMatchObject({ ok: false, error: 'invalid' });
    expect(service.command('h-henrique', 'study.start', { kind: 'review', aheadTopicId: topicId, limit: 5 })).toMatchObject({ ok: false, error: 'invalid' });
    expect(start('henrique', { kind: 'review', aheadTopicId: 'nope' })).toBeNull();
  });
});
