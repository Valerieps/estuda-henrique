import { beforeEach, describe, expect, it } from 'vitest';
import type { SettingsView, StudySessionView, TodayView } from '../../src/application/api-contract';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
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
  clock = fixedClock('2026-11-13T15:00:00Z'); // a Friday
  service = new GroupService(memorySql(), clock, sequentialIds());
  service.migrate();
  service.signIn(profile('ana@example.com'), 'h-ana', ['ana@example.com']);
  for (const who of ['henrique', 'bia']) {
    service.command('h-ana', 'invite.create', { email: `${who}@example.com` });
    service.signIn(profile(`${who}@example.com`), `h-${who}`, []);
  }
  const [subject] = ok<{ topics: { id: string }[] }[]>(service.query('h-ana', 'subjects', {}));
  topicId = subject.topics[0]?.id ?? ok<{ id: string }>(service.command('h-ana', 'topic.create', { subjectId: 'biologia', name: 'Citologia' })).id;
});

function systemCards(count: number): string[] {
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    const note = ok<{ cards: { id: string }[] }>(service.command('h-ana', 'note.create', { topicId, kind: 'basic', front: `P${i}`, back: `R${i}` }));
    ids.push(note.cards[0].id);
  }
  return ids;
}

const todayOf = (who: string) => ok<TodayView>(service.query(`h-${who}`, 'today', {}));
const command = (who: string, name: string, input: Record<string, unknown> = {}) => service.command(`h-${who}`, name, input);

/** Studies one card and finishes the session: the day counts. */
function studyOne(who: string) {
  const session = ok<StudySessionView>(command(who, 'study.start', { kind: 'review', limit: 1 }));
  command(who, 'study.answer', { sessionId: session.sessionId, cardId: session.cards[0].id, answer: 'good' });
  command(who, 'study.end', { sessionId: session.sessionId });
}

describe('Hoje', () => {
  it('on first use has the new-card goal, no flame and no study history', () => {
    systemCards(25);
    expect(todayOf('henrique')).toMatchObject({
      reviewsLeft: 0,
      newLeft: 20,
      hasStudied: false,
      restToday: false,
      routineWhen: null,
      streak: { days: 0, litToday: false, canRepair: false },
    });
  });

  it('shrinks the goal as he studies and lights the flame when a session ends', () => {
    systemCards(3);
    studyOne('henrique');
    expect(todayOf('henrique')).toMatchObject({ newLeft: 2, hasStudied: true, streak: { days: 1, litToday: true } });
  });

  it('does not count a session left without an answer', () => {
    systemCards(3);
    const session = ok<StudySessionView>(command('henrique', 'study.start', { kind: 'review' }));
    command('henrique', 'study.end', { sessionId: session.sessionId });
    expect(todayOf('henrique').streak.days).toBe(0);
  });

  it("never shows another member's progress", () => {
    systemCards(3);
    studyOne('henrique');
    expect(todayOf('bia')).toMatchObject({ newLeft: 3, hasStudied: false, streak: { days: 0 } });
  });

  it('marks his rest day of the week', () => {
    command('henrique', 'settings.update', { restDays: [5] });
    expect(todayOf('henrique').restToday).toBe(true);
  });
});

describe('the streak', () => {
  it('counts a day he opened Hoje with nothing to study, but not one with cards left', () => {
    systemCards(2);
    command('henrique', 'streak.touch');
    expect(todayOf('henrique').streak.litToday).toBe(false);
    const empty = new GroupService(memorySql(), clock, sequentialIds());
    empty.migrate();
    empty.signIn(profile('ana@example.com'), 'h-ana', ['ana@example.com']);
    empty.command('h-ana', 'invite.create', { email: 'henrique@example.com' });
    empty.signIn(profile('henrique@example.com'), 'h-henrique', []);
    empty.command('h-henrique', 'streak.touch', {});
    expect(ok<TodayView>(empty.query('h-henrique', 'today', {})).streak).toMatchObject({ days: 1, litToday: true });
  });

  it('fixes one missed day, once a month', () => {
    systemCards(10);
    clock.set('2026-11-09T15:00:00Z');
    studyOne('henrique');
    clock.set('2026-11-10T15:00:00Z');
    studyOne('henrique');
    clock.set('2026-11-12T15:00:00Z'); // the 11th was missed
    studyOne('henrique');
    expect(todayOf('henrique').streak).toMatchObject({ days: 1, canRepair: true });
    ok(command('henrique', 'streak.repair'));
    expect(todayOf('henrique').streak).toMatchObject({ days: 4, canRepair: false });
    expect(command('henrique', 'streak.repair')).toEqual({ ok: false, error: 'conflict' });
  });

  it('refuses to repair when nothing was missed', () => {
    expect(command('henrique', 'streak.repair')).toEqual({ ok: false, error: 'conflict' });
  });
});

describe('Ajustes', () => {
  it('starts with the defaults', () => {
    expect(ok<SettingsView>(service.query('h-henrique', 'settings', {}))).toEqual({ newPerDay: 20, restDays: [], routineWhen: null, routineWhere: null });
  });

  it('changes only what is given and trims the routine', () => {
    ok(command('henrique', 'settings.update', { newPerDay: 30, restDays: [6, 0, 6], routineWhen: '  de manhã ' }));
    ok(command('henrique', 'settings.update', { routineWhere: 'no ônibus da escola' }));
    expect(ok<SettingsView>(service.query('h-henrique', 'settings', {}))).toEqual({
      newPerDay: 30,
      restDays: [0, 6],
      routineWhen: 'de manhã',
      routineWhere: 'no ônibus da escola',
    });
    ok(command('henrique', 'settings.update', { routineWhen: '' }));
    expect(ok<SettingsView>(service.query('h-henrique', 'settings', {})).routineWhen).toBeNull();
  });

  it('keeps the new-card limit between 5 and 50', () => {
    for (const newPerDay of [4, 51, 20.5, '20']) expect(command('henrique', 'settings.update', { newPerDay })).toEqual({ ok: false, error: 'invalid' });
    ok(command('henrique', 'settings.update', { newPerDay: 5 }));
    ok(command('henrique', 'settings.update', { newPerDay: 50 }));
  });

  it('refuses a bad weekday or a routine that is too long', () => {
    expect(command('henrique', 'settings.update', { restDays: [7] })).toEqual({ ok: false, error: 'invalid' });
    expect(command('henrique', 'settings.update', { routineWhere: 'x'.repeat(61) })).toEqual({ ok: false, error: 'invalid' });
  });

  it("applies his new limit to the day's goal and keeps it private", () => {
    systemCards(30);
    command('henrique', 'settings.update', { newPerDay: 10 });
    expect(todayOf('henrique').newLeft).toBe(10);
    expect(todayOf('bia').newLeft).toBe(20);
  });
});
