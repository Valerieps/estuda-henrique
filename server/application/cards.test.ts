import { beforeEach, describe, expect, it } from 'vitest';
import type { NoteView, SubjectView } from '../../src/application/api-contract';
import { fixedClock, emptyDeckSql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';

const profile = (email: string) => ({ sub: `sub:${email}`, email, name: email.split('@')[0], picture: null });

let service: GroupService;
let admin: string;
let henrique: string;
let bia: string;

function join(email: string, hash: string): string {
  service.command(admin, 'invite.create', { email });
  expect(service.signIn(profile(email), hash, [])).toMatchObject({ ok: true });
  return hash;
}

beforeEach(() => {
  service = new GroupService(emptyDeckSql(), fixedClock('2026-11-14T12:00:00Z'), sequentialIds());
  service.migrate();
  service.signIn(profile('ana@example.com'), 'h-ana', ['ana@example.com']);
  admin = 'h-ana';
  henrique = join('henrique@example.com', 'h-henrique');
  bia = join('bia@example.com', 'h-bia');
});

const ok = <T>(r: { ok: boolean }): T => {
  expect(r).toMatchObject({ ok: true });
  return (r as unknown as { value: T }).value;
};

function topic(name = 'Verminoses'): string {
  return ok<{ id: string }>(service.command(admin, 'topic.create', { subjectId: 'biologia', name })).id;
}

const subjects = (who = henrique) => ok<SubjectView[]>(service.query(who, 'subjects', {}));
const notes = (who: string, topicId: string) => ok<NoteView[]>(service.query(who, 'notes', { topicId }));
const basic = (topicId: string, front = 'O que é ATP?', back = 'Energia') => ({ topicId, kind: 'basic', front, back });

describe('topics', () => {
  it('lets the admin create, rename and reorder; the order is kept', () => {
    const a = topic('Bacterioses');
    const b = topic('Viroses');
    expect(subjects()[0].topics.map((t) => t.name)).toEqual(['Bacterioses', 'Viroses']);
    ok(service.command(admin, 'topic.rename', { topicId: a, name: '  Bacterioses   humanas ' }));
    expect(ok(service.command(admin, 'topic.reorder', { subjectId: 'biologia', topicIds: [b, a] }))).toBeNull();
    expect(subjects()[0].topics.map((t) => t.name)).toEqual(['Viroses', 'Bacterioses humanas']);
  });

  it('refuses everyone but the admin', () => {
    const t = topic();
    expect(service.command(henrique, 'topic.create', { subjectId: 'biologia', name: 'X' })).toEqual({ ok: false, error: 'forbidden' });
    expect(service.command(henrique, 'topic.rename', { topicId: t, name: 'X' })).toEqual({ ok: false, error: 'forbidden' });
    expect(service.command(henrique, 'topic.reorder', { subjectId: 'biologia', topicIds: [t] })).toEqual({ ok: false, error: 'forbidden' });
  });

  it('validates names, subjects and the reorder list', () => {
    const t = topic();
    expect(service.command(admin, 'topic.create', { subjectId: 'biologia', name: '  ' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command(admin, 'topic.create', { subjectId: 'quimica', name: 'X' })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command(admin, 'topic.rename', { topicId: 'nope', name: 'X' })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command(admin, 'topic.reorder', { subjectId: 'biologia', topicIds: [] })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command(admin, 'topic.reorder', { subjectId: 'biologia', topicIds: [t, t] })).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('creating notes', () => {
  it('makes system notes for the admin and personal ones for the student', () => {
    const t = topic();
    const system = ok<NoteView>(service.command(admin, 'note.create', basic(t)));
    const personal = ok<NoteView>(service.command(henrique, 'note.create', basic(t, 'Meu', 'Resposta')));
    expect(system).toMatchObject({ origin: 'system', cards: [{ clozeIndex: 0, suspended: false }] });
    expect(personal.origin).toBe('personal');
    expect(notes(henrique, t).map((n) => n.origin)).toEqual(['system', 'personal']);
  });

  it('makes one card per cloze passage and none for a cloze without passages', () => {
    const t = topic();
    const note = ok<NoteView>(service.command(admin, 'note.create', { topicId: t, kind: 'cloze', front: 'A {{mitocôndria}} faz a {{respiração celular}}' }));
    expect(note.cards.map((c) => c.clozeIndex)).toEqual([1, 2]);
    expect(service.command(admin, 'note.create', { topicId: t, kind: 'cloze', front: 'sem lacuna' })).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects bad input', () => {
    const t = topic();
    for (const bad of [
      { ...basic(t), front: ' ' },
      { ...basic(t), back: '' },
      { ...basic(t), kind: 'image' },
      { ...basic(t), front: 'x'.repeat(5001) },
      { ...basic(t), hint: 5 },
    ]) {
      expect(service.command(admin, 'note.create', bad)).toEqual({ ok: false, error: 'invalid' });
    }
    expect(service.command(admin, 'note.create', basic('nope'))).toEqual({ ok: false, error: 'not_found' });
  });

  it('keeps a hint and drops an empty one', () => {
    const t = topic();
    expect(ok<NoteView>(service.command(admin, 'note.create', { ...basic(t), hint: ' macete ' })).hint).toBe('macete');
    expect(ok<NoteView>(service.command(admin, 'note.create', { ...basic(t), hint: '  ' })).hint).toBeNull();
  });

  it('creates many notes, all or none', () => {
    const t = topic();
    const made = ok<NoteView[]>(service.command(henrique, 'note.createMany', { notes: [basic(t, 'a', 'b'), { topicId: t, kind: 'cloze', front: 'x {{y}}' }] }));
    expect(made).toHaveLength(2);
    expect(made.every((n) => n.origin === 'personal')).toBe(true);
    expect(service.command(henrique, 'note.createMany', { notes: [basic(t, 'c', 'd'), { ...basic(t), front: '' }] })).toEqual({ ok: false, error: 'invalid' });
    expect(notes(henrique, t)).toHaveLength(2);
    expect(service.command(henrique, 'note.createMany', { notes: [] })).toEqual({ ok: false, error: 'invalid' });
  });

  it('tells the screens that cards changed', () => {
    const t = topic();
    expect(service.command(admin, 'note.create', basic(t))).toMatchObject({ changed: ['cards'] });
  });
});

describe('privacy (ADR-009)', () => {
  it('never shows a personal note to another member or to the admin', () => {
    const t = topic();
    const mine = ok<NoteView>(service.command(henrique, 'note.create', basic(t, 'segredo', 'x')));
    service.command(admin, 'note.create', basic(t, 'público', 'y'));
    expect(notes(bia, t).map((n) => n.front)).toEqual(['público']);
    expect(notes(admin, t).map((n) => n.front)).toEqual(['público']);

    for (const who of [bia, admin]) {
      expect(service.command(who, 'note.update', { noteId: mine.id, front: 'hack', back: 'hack' })).toEqual({ ok: false, error: 'not_found' });
    }
    expect(service.command(bia, 'card.suspend', { cardId: mine.cards[0].id, suspended: true })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command(admin, 'note.delete', { noteId: mine.id })).toEqual({ ok: false, error: 'not_found' });
    expect(notes(henrique, t).find((n) => n.id === mine.id)?.front).toBe('segredo');
  });

  it('keeps suspension per member on a system card', () => {
    const t = topic();
    const note = ok<NoteView>(service.command(admin, 'note.create', basic(t)));
    const card = note.cards[0].id;
    ok(service.command(henrique, 'card.suspend', { cardId: card, suspended: true }));
    expect(notes(henrique, t)[0].cards[0].suspended).toBe(true);
    expect(notes(bia, t)[0].cards[0].suspended).toBe(false);
    ok(service.command(henrique, 'card.suspend', { cardId: card, suspended: false }));
    expect(notes(henrique, t)[0].cards[0].suspended).toBe(false);
  });

  it('suspending needs a real card and a boolean', () => {
    expect(service.command(henrique, 'card.suspend', { cardId: 'nope', suspended: true })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command(henrique, 'card.suspend', { cardId: 'nope', suspended: 'yes' })).toEqual({ ok: false, error: 'invalid' });
  });

  it('needs a session', () => {
    expect(service.query('nobody', 'subjects', {})).toEqual({ ok: false, error: 'unauthenticated' });
    expect(service.command('nobody', 'note.create', {})).toEqual({ ok: false, error: 'unauthenticated' });
  });
});

describe('editing and deleting', () => {
  it('lets the student edit everything on a system note, and only he sees his version', () => {
    const t = topic();
    const note = ok<NoteView>(service.command(admin, 'note.create', { ...basic(t), hint: 'macete' }));
    const edited = ok<NoteView>(service.command(henrique, 'note.update', { noteId: note.id, front: 'Novo', back: 'Nova', hint: null }));
    expect(edited).toMatchObject({ front: 'Novo', back: 'Nova', hint: null, origin: 'system' });
    expect(notes(henrique, t)[0]).toMatchObject({ front: 'Novo', back: 'Nova', hint: null, cards: note.cards });
    expect(notes(bia, t)[0]).toMatchObject({ front: 'O que é ATP?', back: 'Energia', hint: 'macete' });
    expect(notes(admin, t)[0]).toMatchObject({ front: 'O que é ATP?' });

    // The admin's edit is everyone's, except where a user has his own version.
    ok(service.command(admin, 'note.update', { noteId: note.id, front: 'Outro', back: 'Nova' }));
    expect(notes(bia, t)[0]).toMatchObject({ front: 'Outro', hint: null });
    expect(notes(henrique, t)[0]).toMatchObject({ front: 'Novo' });
  });

  it('shows the user his version while studying, in the Resumo and in Piores cartas', () => {
    const t = topic();
    const note = ok<NoteView>(service.command(admin, 'note.create', basic(t)));
    ok(service.command(henrique, 'note.update', { noteId: note.id, front: 'Meu', back: 'Minha' }));
    const session = ok<{ sessionId: string; cards: { front: string; back: string }[] }>(service.command(henrique, 'study.start', { kind: 'review' }));
    expect(session.cards[0]).toMatchObject({ front: 'Meu', back: 'Minha' });
    ok(service.command(henrique, 'study.answer', { sessionId: session.sessionId, cardId: note.cards[0].id, answer: 'again' }));
    expect(JSON.stringify(service.query(henrique, 'studySummary', { sessionId: session.sessionId }))).toContain('Meu');
    expect(JSON.stringify(service.query(henrique, 'worstCards', {}))).toContain('Meu');
    const other = ok<{ cards: { front: string }[] }>(service.command(bia, 'study.start', { kind: 'review' }));
    expect(other.cards[0].front).toBe('O que é ATP?');
  });

  it('lets a member with both roles edit the system note for everyone only when she asks', () => {
    const t = topic();
    const note = ok<NoteView>(service.command(admin, 'note.create', basic(t)));
    const biaId = ok<{ id: string }>(service.query(bia, 'me', {})).id;
    ok(service.command(admin, 'member.setRoles', { memberId: biaId, roles: ['admin', 'user'] }));
    ok(service.command(bia, 'note.update', { noteId: note.id, front: 'Só minha', back: 'x' }));
    expect(notes(henrique, t)[0].front).toBe('O que é ATP?');
    ok(service.command(bia, 'note.update', { noteId: note.id, front: 'De todos', back: 'x', system: true }));
    expect(notes(henrique, t)[0].front).toBe('De todos');
    expect(notes(bia, t)[0].front).toBe('Só minha');

    expect(ok<NoteView>(service.command(bia, 'note.create', basic(t, 'Pessoal'))).origin).toBe('personal');
    expect(ok<NoteView>(service.command(bia, 'note.create', { ...basic(t, 'Sistema'), system: true })).origin).toBe('system');
    expect(ok<NoteView>(service.command(henrique, 'note.create', { ...basic(t, 'Dele'), system: true })).origin).toBe('personal');
  });

  it("keeps the passages of a system cloze in a user's version", () => {
    const t = topic();
    const note = ok<NoteView>(service.command(admin, 'note.create', { topicId: t, kind: 'cloze', front: 'A {{a}} e a {{b}}' }));
    expect(service.command(henrique, 'note.update', { noteId: note.id, front: 'A {{a}}' })).toEqual({ ok: false, error: 'invalid' });
    ok(service.command(henrique, 'note.update', { noteId: note.id, front: 'Minha {{a}} e {{b}}' }));
    expect(notes(henrique, t)[0]).toMatchObject({ front: 'Minha {{a}} e {{b}}', cards: note.cards });
    expect(notes(bia, t)[0].front).toBe('A {{a}} e a {{b}}');
  });

  it('lets the student edit his own note and keeps its kind', () => {
    const t = topic();
    const note = ok<NoteView>(service.command(henrique, 'note.create', basic(t)));
    expect(ok<NoteView>(service.command(henrique, 'note.update', { noteId: note.id, front: 'Q', back: 'A' }))).toMatchObject({ kind: 'basic', front: 'Q' });
    expect(service.command(henrique, 'note.update', { noteId: note.id, front: '', back: 'A' })).toEqual({ ok: false, error: 'invalid' });
  });

  it('keeps the card (and history) of a passage that stays, retires one that goes, brings it back', () => {
    const t = topic();
    const note = ok<NoteView>(service.command(admin, 'note.create', { topicId: t, kind: 'cloze', front: 'A {{a}} e a {{b}}' }));
    const [c1, c2] = note.cards;
    ok(service.command(henrique, 'card.suspend', { cardId: c1.id, suspended: true }));

    const one = ok<NoteView>(service.command(admin, 'note.update', { noteId: note.id, front: 'A {{a}}' }));
    expect(one.cards.map((c) => c.id)).toEqual([c1.id]);
    expect(notes(henrique, t)[0].cards[0].suspended).toBe(true);

    const three = ok<NoteView>(service.command(admin, 'note.update', { noteId: note.id, front: 'A {{a}} e {{b}} e {{c}}' }));
    expect(three.cards.map((c) => c.id).slice(0, 2)).toEqual([c1.id, c2.id]);
    expect(three.cards).toHaveLength(3);
  });

  it('deletes a system note for the admin only, and never touches the history', () => {
    const t = topic();
    const note = ok<NoteView>(service.command(admin, 'note.create', basic(t)));
    const card = note.cards[0].id;
    // A past answer of the student.
    service['ctx'].sql.run("INSERT INTO study_sessions (id, member_id, kind, is_training, study_day, started_at) VALUES ('s', (SELECT id FROM members WHERE email = 'henrique@example.com'), 'review', 0, '2026-11-14', 'x')");
    service['ctx'].sql.run(
      "INSERT INTO reviews (id, member_id, card_id, session_id, rating, reviewed_at, study_day, is_training) VALUES ('r', (SELECT id FROM members WHERE email = 'henrique@example.com'), ?, 's', 'good', 'x', '2026-11-14', 0)",
      card,
    );

    expect(service.command(henrique, 'note.delete', { noteId: note.id })).toEqual({ ok: false, error: 'forbidden' });
    expect(service.command(admin, 'note.delete', { noteId: 'nope' })).toEqual({ ok: false, error: 'not_found' });
    ok(service.command(admin, 'note.delete', { noteId: note.id }));

    expect(notes(henrique, t)).toEqual([]);
    expect(service.command(henrique, 'note.update', { noteId: note.id, front: 'x', back: 'y' })).toEqual({ ok: false, error: 'not_found' });
    expect(service['ctx'].sql.all('SELECT card_id FROM reviews')).toEqual([{ card_id: card }]);
    expect(service['ctx'].sql.all('SELECT id FROM cards WHERE id = ?', card)).toHaveLength(1);
  });
});
