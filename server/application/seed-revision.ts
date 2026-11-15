// Revision 1 of the initial deck (docs/spec/boas-cartas.md, "Revisar uma carta do sistema"): each
// entry of `server/seed/biologia-revisao-1.json` replaces one card of the initial deck with new
// system notes in the same topic, and the old card is suspended for every member, present and
// future (`superseded_cards`, read when a member joins). The old note stays, with its history.
import revision from '../seed/biologia-revisao-1.json';
import revisionTwo from '../seed/biologia-revisao-2.json';
import { cardIndexes, type NoteKind } from '../../src/domain/study/cloze';
import { nowIso, type Context } from './context';

interface BasicCard {
  readonly frente: string;
  readonly verso: string;
  readonly macete?: string;
}

interface ClozeCard {
  readonly lacuna: string;
}

export type RevisedCard = BasicCard | ClozeCard;

export interface Revision {
  readonly substitui: string;
  readonly cartas: readonly RevisedCard[];
}

export interface RevisionFile {
  readonly revisoes: readonly Revision[];
}

const quote = (text: string | null): string => (text === null ? 'NULL' : `'${text.replace(/'/g, "''")}'`);
const AT = quote('2026-11-15T00:00:00.000Z');

/** The id of the single card of an initial-deck note (migration 6 and 7). */
export const seedCardId = (deckCardId: string): string => `seed-${deckCardId}-0`;

interface NoteText {
  readonly kind: NoteKind;
  readonly front: string;
  readonly back: string;
  readonly hint: string | null;
}

function noteText(card: RevisedCard): NoteText {
  if ('lacuna' in card) return { kind: 'cloze', front: card.lacuna, back: '', hint: null };
  return { kind: 'basic', front: card.frente, back: card.verso, hint: card.macete ?? null };
}

function revisionNoteStatements(r: Revision, prefix: string): string[] {
  const old = quote(`seed-${r.substitui}`);
  return r.cartas.flatMap((card, n) => {
    const text = noteText(card);
    const note = quote(`${prefix}-${r.substitui}-${n + 1}`);
    // The new note goes to the old note's topic; nothing is added when the admin deleted the old one.
    return [
      `INSERT INTO notes (id, topic_id, owner_id, kind, front, back, hint, created_at, updated_at)
         SELECT ${note}, topic_id, NULL, ${quote(text.kind)}, ${quote(text.front)}, ${quote(text.back)}, ${quote(text.hint)}, ${AT}, ${AT}
         FROM notes WHERE id = ${old} AND deleted_at IS NULL`,
      ...cardIndexes(text.kind, text.front).map(
        (index) =>
          `INSERT INTO cards (id, note_id, cloze_index)
             SELECT ${quote(`${prefix}-${r.substitui}-${n + 1}-${index}`)}, id, ${index} FROM notes WHERE id = ${note}`,
      ),
    ];
  });
}

/** The statements of one revision file: new notes and cards, then the old cards suspended for all. */
export function revisionStatements(file: RevisionFile, prefix: string): string[] {
  const superseded = file.revisoes.map((r) => quote(seedCardId(r.substitui))).join(', ');
  return [
    ...file.revisoes.flatMap((r) => revisionNoteStatements(r, prefix)),
    `INSERT OR IGNORE INTO superseded_cards (card_id) SELECT id FROM cards WHERE id IN (${superseded})`,
    `INSERT INTO card_states
       (member_id, card_id, stage, due, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review, suspended)
       SELECT members.id, superseded_cards.card_id, 'new', ${AT}, 0, 0, 0, 0, 0, 0, NULL, 1
       FROM members, superseded_cards WHERE true
       ON CONFLICT (member_id, card_id) DO UPDATE SET suspended = 1`,
  ];
}

/** Migration 10: the table of superseded cards and revision 1 of the initial deck. */
export function revisionOneStatements(file: RevisionFile = revision as RevisionFile): string[] {
  return [`CREATE TABLE superseded_cards (card_id TEXT PRIMARY KEY REFERENCES cards(id))`, ...revisionStatements(file, 'rev1')];
}

/** A member who joins starts with every superseded card suspended, as the members before them. */
export function suspendSupersededCards(ctx: Context, memberId: string): void {
  ctx.sql.run(
    `INSERT INTO card_states
       (member_id, card_id, stage, due, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review, suspended)
       SELECT ?, card_id, 'new', ?, 0, 0, 0, 0, 0, 0, NULL, 1 FROM superseded_cards WHERE true
       ON CONFLICT (member_id, card_id) DO UPDATE SET suspended = 1`,
    memberId,
    nowIso(ctx),
  );
}

interface NoteEdit {
  readonly nota: string;
  readonly frente: string;
  readonly verso: string;
  readonly macete?: string;
}

export interface EditFile {
  readonly apagar: readonly { readonly nota: string; readonly motivo: string }[];
  readonly editar: readonly NoteEdit[];
}

/**
 * A revision that changes system notes in place, for every member (docs/spec/boas-cartas.md):
 * a note in `apagar` is deleted, a basic note in `editar` gets new text and keeps its card and
 * study history. A note the admin already deleted is left as it is.
 */
export function editStatements(file: EditFile, at: string): string[] {
  const when = quote(at);
  return [
    ...file.apagar.map(
      (d) => `UPDATE notes SET deleted_at = ${when} WHERE id = ${quote(d.nota)} AND owner_id IS NULL AND deleted_at IS NULL`,
    ),
    ...file.editar.map(
      (e) =>
        `UPDATE notes SET front = ${quote(e.frente)}, back = ${quote(e.verso)}, hint = ${quote(e.macete ?? null)}, updated_at = ${when}
           WHERE id = ${quote(e.nota)} AND owner_id IS NULL AND kind = 'basic' AND deleted_at IS NULL`,
    ),
  ];
}

/** Migration 11: revision 2, the system cards reviewed against the PAS 2 matrix (docs/PAS.md). */
export function revisionTwoStatements(file: EditFile = revisionTwo as EditFile): string[] {
  return editStatements(file, '2026-11-15T12:00:00.000Z');
}
