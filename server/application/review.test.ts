import { beforeEach, describe, expect, it } from 'vitest';
import type { StudySessionView } from '../../src/application/api-contract';
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

/** The admin writes `count` system notes; returns the ids of their cards in order. */
function systemCards(count: number): string[] {
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    const note = ok<{ cards: { id: string }[] }>(service.command('h-ana', 'note.create', { topicId, kind: 'basic', front: `P${i}`, back: `R${i}` }));
    ids.push(note.cards[0].id);
  }
  return ids;
}

const start = (who: string, input: Record<string, unknown> = { kind: 'review' }) => ok<StudySessionView | null>(service.command(`h-${who}`, 'study.start', input));
const answer = (who: string, sessionId: string, cardId: string, rating: string) => service.command(`h-${who}`, 'study.answer', { sessionId, cardId, answer: rating });

describe('the day queue', () => {
  it('has the new cards up to the daily limit, and none when the day is done', () => {
    systemCards(25);
    const session = start('henrique')!;
    expect(session).toMatchObject({ kind: 'review', training: false });
    expect(session.cards).toHaveLength(20);
    expect(session.cards[0]).toMatchObject({ front: 'P1', topicName: 'Citologia', state: { stage: 'new' } });
  });

  it('counts the new cards seen today against the limit, and gives the day back at midnight in Brasília', () => {
    const ids = systemCards(25);
    const first = start('henrique', { kind: 'review', limit: 5 })!;
    expect(first.cards.map((c) => c.id)).toEqual(ids.slice(0, 5));
    for (const id of ids.slice(0, 20)) answer('henrique', first.sessionId, id, 'good');
    // 20 seen today: only those still in learning come back; no new card until the day turns.
    const again = start('henrique')!;
    expect(again.cards.map((c) => c.id)).toEqual(ids.slice(0, 20));
    expect(again.cards.every((c) => c.state.stage === 'learning')).toBe(true);
    clock.set('2026-11-14T03:30:00Z');
    expect(start('henrique')!.cards.map((c) => c.id)).toEqual(expect.arrayContaining(ids.slice(20)));
    expect(start('henrique')!.cards).toHaveLength(25);
  });

  it('puts cards in learning first, then reviews due today, then new; leaves out what is not due', () => {
    const ids = systemCards(4);
    const session = start('henrique')!;
    answer('henrique', session.sessionId, ids[0], 'again'); // learning, due in 1 minute
    answer('henrique', session.sessionId, ids[1], 'good'); // learning step 2, due in 10 minutes
    clock.set('2026-11-13T15:30:00Z');
    const next = start('henrique')!;
    expect(next.cards.map((c) => c.id).slice(0, 2)).toEqual([ids[0], ids[1]]);
    expect(next.cards.map((c) => c.id)).toEqual([ids[0], ids[1], ids[2], ids[3]]);
    expect(next.cards.map((c) => c.state.stage)).toEqual(['learning', 'learning', 'new', 'new']);
  });

  it('keeps a review due tomorrow out of today, and brings it in tomorrow', () => {
    const [card] = systemCards(1);
    const s1 = start('henrique')!;
    for (const step of ['good', 'good']) {
      answer('henrique', s1.sessionId, card, step);
      clock.set(new Date(clock.now().getTime() + 11 * 60_000).toISOString());
    }
    // After the learning steps the card is a review scheduled for days ahead.
    expect(start('henrique')).toBeNull();
    clock.set('2026-12-30T15:00:00Z');
    expect(start('henrique')!.cards).toMatchObject([{ id: card, state: { stage: 'review' } }]);
  });

  it('never includes suspended cards, deleted notes or another member\'s personal cards', () => {
    const [a, b] = systemCards(2);
    service.command('h-henrique', 'card.suspend', { cardId: a, suspended: true });
    const personal = ok<{ cards: { id: string }[] }>(service.command('h-bia', 'note.create', { topicId, kind: 'basic', front: 'Dela', back: 'x' }));
    const session = start('henrique')!;
    expect(session.cards.map((c) => c.id)).toEqual([b]);
    expect(start('bia')!.cards.map((c) => c.id)).toEqual([a, b, personal.cards[0].id]);
  });

  it('stops at the limit of Só 5 cartas and refuses a bad one', () => {
    systemCards(8);
    expect(start('henrique', { kind: 'review', limit: 5 })!.cards).toHaveLength(5);
    expect(service.command('h-henrique', 'study.start', { kind: 'review', limit: 0 })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-henrique', 'study.start', { kind: 'bogus' })).toEqual({ ok: false, error: 'invalid' });
  });

  it('returns nothing, and opens no session, when there are no cards', () => {
    expect(start('henrique')).toBeNull();
  });
});

describe('answers and undo', () => {
  it('records an answer on the member\'s own state and undoes it', () => {
    const [card] = systemCards(1);
    const session = start('henrique')!;
    const { state } = ok<{ state: { stage: string; reps: number } }>(answer('henrique', session.sessionId, card, 'again'));
    expect(state).toMatchObject({ stage: 'learning', reps: 1 });
    expect(start('bia')!.cards[0].state).toMatchObject({ stage: 'new', reps: 0 });

    const undone = ok<{ cardId: string; state: { stage: string; reps: number } }>(service.command('h-henrique', 'study.undo', { sessionId: session.sessionId }));
    expect(undone).toMatchObject({ cardId: card, state: { stage: 'new', reps: 0 } });
    expect(service.command('h-henrique', 'study.undo', { sessionId: session.sessionId })).toEqual({ ok: false, error: 'not_found' });
  });

  it('refuses another member\'s session, an unknown answer and a card the member cannot see', () => {
    const [card] = systemCards(1);
    const personal = ok<{ cards: { id: string }[] }>(service.command('h-bia', 'note.create', { topicId, kind: 'basic', front: 'Dela', back: 'x' }));
    const session = start('henrique')!;
    expect(answer('bia', session.sessionId, card, 'good')).toEqual({ ok: false, error: 'not_found' });
    expect(answer('henrique', session.sessionId, card, 'easy')).toEqual({ ok: false, error: 'invalid' });
    expect(answer('henrique', session.sessionId, personal.cards[0].id, 'good')).toEqual({ ok: false, error: 'not_found' });
    expect(service.command('h-bia', 'study.undo', { sessionId: session.sessionId })).toEqual({ ok: false, error: 'not_found' });
    // An admin who is not also a user does not study.
    expect(service.command('h-ana', 'study.start', { kind: 'review' })).toEqual({ ok: false, error: 'forbidden' });
  });

  it('refuses answers after the session ends', () => {
    const [card] = systemCards(1);
    const session = start('henrique')!;
    ok(service.command('h-henrique', 'study.end', { sessionId: session.sessionId }));
    expect(answer('henrique', session.sessionId, card, 'good')).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('training', () => {
  it('studies exactly the cards asked for and does not count toward accuracy', () => {
    const [a, b, c] = systemCards(3);
    service.command('h-henrique', 'card.suspend', { cardId: b, suspended: true });
    const session = start('henrique', { kind: 'retry', cardIds: [c, b, a, a] })!;
    expect(session).toMatchObject({ kind: 'retry', training: true });
    expect(session.cards.map((x) => x.id)).toEqual([c, a]);
    answer('henrique', session.sessionId, c, 'good');
  });

  it('needs the cards to train on', () => {
    systemCards(1);
    expect(service.command('h-henrique', 'study.start', { kind: 'cram' })).toEqual({ ok: false, error: 'invalid' });
  });
});
