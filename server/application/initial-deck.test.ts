import { describe, expect, it } from 'vitest';
import deck from '../seed/biologia-decks.json';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import type { NoteView, SubjectView } from '../../src/application/api-contract';
import { GroupService } from './group-service';
import { ADDED_TOPICS, INITIAL_TOPICS, addedDeckStatements, leftOut, topicFor } from './initial-deck';

const total = deck.decks.reduce((n, d) => n + d.cartas.length, 0);

describe('the initial Biologia deck', () => {
  it('leaves out only the decks the school list has no topic for', () => {
    const decks = new Set(leftOut().map((l) => l.deck));
    expect([...decks].sort()).toEqual(['ecologia-contexto', 'embriologia', 'fisiologia-humana']);
    expect(leftOut().reduce((n, l) => n + l.cards, 0)).toBe(24);
  });

  it('adds a topic for each left-out deck, with all 24 cards, in migration 7', () => {
    const statements = addedDeckStatements();
    expect(statements.filter((s) => s.startsWith('INSERT INTO topics'))).toHaveLength(ADDED_TOPICS.length);
    expect(statements.filter((s) => s.startsWith('INSERT INTO cards'))).toHaveLength(24);
  });

  it('sends every other card to a topic that exists', () => {
    for (const d of deck.decks) {
      for (const card of d.cartas) {
        const topic = topicFor(d.id, card.subtema);
        if (topic !== null) expect(INITIAL_TOPICS).toContain(topic);
      }
    }
  });

  it('gives the student the cards as system cards on his first access', () => {
    const service = new GroupService(memorySql(), fixedClock('2026-11-20T12:00:00Z'), sequentialIds());
    service.migrate();
    service.migrate();
    expect(service.signIn({ sub: 's1', email: 'ana@example.com', name: 'Ana', picture: null }, 'h-ana', ['ana@example.com'])).toMatchObject({ ok: true });
    expect(service.command('h-ana', 'invite.create', { email: 'hen@example.com' })).toMatchObject({ ok: true });
    expect(service.signIn({ sub: 's2', email: 'hen@example.com', name: 'Henrique', picture: null }, 'h-hen', [])).toMatchObject({ ok: true });

    const subjects = service.query('h-hen', 'subjects', {});
    if (!subjects.ok) throw new Error('subjects failed');
    const topics = (subjects.value as SubjectView[])[0].topics;
    expect(topics.map((t) => t.name)).toEqual([...INITIAL_TOPICS, ...ADDED_TOPICS]);

    let cards = 0;
    for (const topic of topics) {
      const notes = service.query('h-hen', 'notes', { topicId: topic.id });
      if (!notes.ok) throw new Error('notes failed');
      const list = notes.value as NoteView[];
      expect(list.length).toBeGreaterThan(0);
      for (const note of list) {
        expect(note.origin).toBe('system');
        cards += note.cards.length;
      }
    }
    expect(cards).toBe(total);
  });
});
