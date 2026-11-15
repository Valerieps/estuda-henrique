import { describe, expect, it } from 'vitest';
import deck from '../seed/biologia-decks.json';
import revision from '../seed/biologia-revisao-1.json';
import { clozePassages } from '../../src/domain/study/cloze';
import type { NoteView, SubjectView } from '../../src/application/api-contract';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';
import { revisionStatements, seedCardId, type RevisionFile } from './seed-revision';

const file = revision as RevisionFile;
const deckIds = new Set(deck.decks.flatMap((d) => d.cartas.map((c) => c.id)));
const replaced = new Set(file.revisoes.map((r) => r.substitui));
const newNotes = file.revisoes.reduce((n, r) => n + r.cartas.length, 0);
const newCards = file.revisoes
  .flatMap((r) => r.cartas)
  .reduce((n, c) => n + ('lacuna' in c ? clozePassages(c.lacuna).length : 1), 0);

const profile = (email: string, name: string) => ({ sub: `sub:${email}`, email, name, picture: null });

function setUp() {
  const sql = memorySql();
  const service = new GroupService(sql, fixedClock('2026-11-20T12:00:00Z'), sequentialIds());
  service.migrate();
  expect(service.signIn(profile('ana@example.com', 'Ana'), 'h-ana', ['ana@example.com'])).toMatchObject({ ok: true });
  return { sql, service };
}

function join(service: GroupService, email: string, hash: string) {
  expect(service.command('h-ana', 'invite.create', { email })).toMatchObject({ ok: true });
  expect(service.signIn(profile(email, email), hash, [])).toMatchObject({ ok: true });
}

function allNotes(service: GroupService, hash: string): NoteView[] {
  const subjects = service.query(hash, 'subjects', {});
  if (!subjects.ok) throw new Error('subjects failed');
  return (subjects.value as SubjectView[])[0].topics.flatMap((topic) => {
    const notes = service.query(hash, 'notes', { topicId: topic.id });
    if (!notes.ok) throw new Error('notes failed');
    return notes.value as NoteView[];
  });
}

describe('revision 1 of the initial deck', () => {
  it('replaces each initial card at most once, and only cards that exist', () => {
    expect(replaced.size).toBe(file.revisoes.length);
    for (const id of replaced) expect(deckIds.has(id)).toBe(true);
  });

  it('writes every new card with text, and every cloze with a marked passage', () => {
    for (const card of file.revisoes.flatMap((r) => r.cartas)) {
      if ('lacuna' in card) expect(clozePassages(card.lacuna).length).toBeGreaterThan(0);
      else expect(card.frente.trim() && card.verso.trim()).toBeTruthy();
    }
  });

  it('adds the new cards as system cards in the old card topic and suspends the old ones for a member who joins later', () => {
    const { service } = setUp();
    join(service, 'hen@example.com', 'h-hen');
    const notes = allNotes(service, 'h-hen');

    const cards = notes.flatMap((n) => n.cards);
    expect(cards).toHaveLength(deckIds.size + newCards);
    expect(notes.every((n) => n.origin === 'system')).toBe(true);

    const suspended = cards.filter((c) => c.suspended).map((c) => c.id).sort();
    expect(suspended).toEqual([...replaced].map(seedCardId).sort());

    const topicOf = new Map(notes.map((n) => [n.id, n.topicId]));
    for (const r of file.revisoes) {
      r.cartas.forEach((_, n) => expect(topicOf.get(`rev1-${r.substitui}-${n + 1}`)).toBe(topicOf.get(`seed-${r.substitui}`)));
    }
    expect(notes.filter((n) => n.id.startsWith('rev1-'))).toHaveLength(newNotes);
  });

  it('suspends the old card for a member already there, keeping what they studied', () => {
    const { sql, service } = setUp();
    sql.run(
      `INSERT INTO card_states (member_id, card_id, stage, due, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review, suspended)
       SELECT id, 'seed-cla-05-0', 'review', '2026-12-01T00:00:00.000Z', 5, 5, 10, 0, 3, 0, '2026-11-19T00:00:00.000Z', 0 FROM members`,
    );
    const statements = revisionStatements(
      { revisoes: [{ substitui: 'cla-05', cartas: [{ frente: 'O que um nó representa num cladograma?', verso: 'Um ancestral comum.' }] }] },
      'test',
    );
    for (const statement of statements) sql.run(statement);

    const [state] = sql.all<{ suspended: number; reps: number; stage: string }>(
      "SELECT suspended, reps, stage FROM card_states WHERE card_id = 'seed-cla-05-0'",
    );
    expect(state).toEqual({ suspended: 1, reps: 3, stage: 'review' });
    expect(allNotes(service, 'h-ana').some((n) => n.id === 'test-cla-05-1')).toBe(true);
  });

  it('adds nothing for a card the admin deleted', () => {
    const { sql } = setUp();
    sql.run("UPDATE notes SET deleted_at = '2026-11-19T00:00:00.000Z' WHERE id = 'seed-cla-05'");
    const statements = revisionStatements({ revisoes: [{ substitui: 'cla-05', cartas: [{ lacuna: 'Um {{nó}}.' }] }] }, 'test');
    for (const statement of statements) sql.run(statement);
    expect(sql.all("SELECT id FROM notes WHERE id LIKE 'test-%'")).toEqual([]);
  });
});
