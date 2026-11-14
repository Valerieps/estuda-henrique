// Subjects, topics, notes and cards (docs/spec/cartas.md). Subjects, topics and system notes are
// shared content; a personal note is its owner's alone, and no query or command lets an admin (or
// anyone else) see or touch it (ADR-009). A user's edit of a system note is a version only they
// see (`note_edits`). Deleting a note or dropping a cloze passage only hides it: the study history
// stays as it was.
import type { NoteInput, NoteView, SubjectView, TopicView } from '../../src/application/api-contract';
import { isAdmin, writesSystemCards } from '../../src/domain/group/roles';
import { cardIndexes, type NoteKind } from '../../src/domain/study/cloze';
import { failure, nowIso, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { NOTE_EDITS, noteText } from './note-text';
import { setSuspended } from './study-store';

type Input = Record<string, unknown>;

const MAX_NAME = 100;
const MAX_TEXT = 5000;

interface TopicRow {
  id: string;
  name: string;
  position: number;
}

interface NoteRow {
  id: string;
  topic_id: string;
  owner_id: string | null;
  kind: NoteKind;
  front: string;
  back: string;
  hint: string | null;
}

const topicView = (row: TopicRow): TopicView => ({ id: row.id, name: row.name, position: row.position });

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length > 0 && name.length <= MAX_NAME ? name : null;
}

// ---- Subjects and topics ----

export function listSubjects(ctx: Context): SubjectView[] {
  const topics = ctx.sql.all<TopicRow & { subject_id: string }>('SELECT id, subject_id, name, position FROM topics ORDER BY position, created_at, id');
  return ctx.sql
    .all<{ id: string; name: string }>('SELECT id, name FROM subjects WHERE archived = 0 ORDER BY position')
    .map((s) => ({ id: s.id, name: s.name, topics: topics.filter((t) => t.subject_id === s.id).map(topicView) }));
}

function findTopic(ctx: Context, id: unknown): (TopicRow & { subject_id: string }) | null {
  if (typeof id !== 'string') return null;
  const [row] = ctx.sql.all<TopicRow & { subject_id: string }>('SELECT id, subject_id, name, position FROM topics WHERE id = ?', id);
  return row ?? null;
}

export function createTopic(ctx: Context, actor: Member, input: Input): CommandResult<TopicView> {
  if (!isAdmin(actor)) return failure('forbidden');
  const name = cleanName(input.name);
  if (!name || typeof input.subjectId !== 'string') return failure('invalid');
  const [subject] = ctx.sql.all<{ id: string }>('SELECT id FROM subjects WHERE id = ? AND archived = 0', input.subjectId);
  if (!subject) return failure('not_found');
  const [{ next }] = ctx.sql.all<{ next: number }>('SELECT COALESCE(MAX(position) + 1, 0) AS next FROM topics WHERE subject_id = ?', subject.id);
  const id = ctx.ids.next();
  ctx.sql.run('INSERT INTO topics (id, subject_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)', id, subject.id, name, next, nowIso(ctx));
  return { ok: true, value: { id, name, position: next }, changed: ['subjects'] };
}

export function renameTopic(ctx: Context, actor: Member, input: Input): CommandResult<TopicView> {
  if (!isAdmin(actor)) return failure('forbidden');
  const name = cleanName(input.name);
  if (!name) return failure('invalid');
  const topic = findTopic(ctx, input.topicId);
  if (!topic) return failure('not_found');
  ctx.sql.run('UPDATE topics SET name = ? WHERE id = ?', name, topic.id);
  return { ok: true, value: topicView({ ...topic, name }), changed: ['subjects'] };
}

/** `topicIds` must be exactly the subject's topics, in the new order. */
export function reorderTopics(ctx: Context, actor: Member, input: Input): CommandResult<null> {
  if (!isAdmin(actor)) return failure('forbidden');
  if (typeof input.subjectId !== 'string' || !Array.isArray(input.topicIds)) return failure('invalid');
  const current = ctx.sql.all<{ id: string }>('SELECT id FROM topics WHERE subject_id = ?', input.subjectId).map((t) => t.id);
  if (current.length === 0) return failure('not_found');
  const wanted = input.topicIds as unknown[];
  const sameSet = wanted.length === current.length && new Set(wanted).size === wanted.length && wanted.every((id) => typeof id === 'string' && current.includes(id));
  if (!sameSet) return failure('invalid');
  wanted.forEach((id, position) => ctx.sql.run('UPDATE topics SET position = ? WHERE id = ?', position, id as string));
  return { ok: true, value: null, changed: ['subjects'] };
}

// ---- Notes and cards ----

/** The notes an actor may see: the system's and their own, never another member's. */
const VISIBLE = 'notes.deleted_at IS NULL AND (notes.owner_id IS NULL OR notes.owner_id = ?)';

function toNoteView(ctx: Context, actor: Member, row: NoteRow): NoteView {
  const cards = ctx.sql.all<{ id: string; cloze_index: number; suspended: number | null }>(
    `SELECT cards.id, cards.cloze_index, card_states.suspended FROM cards
     LEFT JOIN card_states ON card_states.card_id = cards.id AND card_states.member_id = ?
     WHERE cards.note_id = ? AND cards.retired = 0 ORDER BY cards.cloze_index`,
    actor.id,
    row.id,
  );
  return {
    id: row.id,
    topicId: row.topic_id,
    origin: row.owner_id === null ? 'system' : 'personal',
    kind: row.kind,
    front: row.front,
    back: row.back,
    hint: row.hint,
    cards: cards.map((c) => ({ id: c.id, clozeIndex: c.cloze_index, suspended: c.suspended === 1 })),
  };
}

/** A note as the actor sees it: with their own version of a system note's text, if any. */
const NOTE_COLUMNS = `notes.id, notes.topic_id, notes.owner_id, notes.kind,
  ${noteText('front')} AS front, ${noteText('back')} AS back, ${noteText('hint')} AS hint`;

export function listNotes(ctx: Context, actor: Member, input: Input): NoteView[] | null {
  if (typeof input.topicId !== 'string') return null;
  return ctx.sql
    .all<NoteRow>(
      `SELECT ${NOTE_COLUMNS} FROM notes ${NOTE_EDITS} WHERE notes.topic_id = ? AND ${VISIBLE} ORDER BY notes.created_at, notes.rowid`,
      actor.id,
      input.topicId,
      actor.id,
    )
    .map((row) => toNoteView(ctx, actor, row));
}

function findVisibleNote(ctx: Context, actor: Member, id: unknown): NoteRow | null {
  if (typeof id !== 'string') return null;
  const [row] = ctx.sql.all<NoteRow>(`SELECT ${NOTE_COLUMNS} FROM notes ${NOTE_EDITS} WHERE notes.id = ? AND ${VISIBLE}`, actor.id, id, actor.id);
  return row ?? null;
}

interface CleanNote {
  readonly front: string;
  readonly back: string;
  readonly hint: string | null;
}

function cleanText(value: unknown, required: boolean): string | null {
  if (value === undefined || value === null) return required ? null : '';
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text.length > MAX_TEXT || (required && text.length === 0)) return null;
  return text;
}

/** Validates the text of a note of `kind`; a cloze needs a marked passage and has no back. */
function cleanNote(kind: NoteKind, input: { front?: unknown; back?: unknown; hint?: unknown }): CleanNote | null {
  const front = cleanText(input.front, true);
  const back = kind === 'basic' ? cleanText(input.back, true) : cleanText(input.back, false);
  const hint = cleanText(input.hint, false);
  if (front === null || back === null || hint === null) return null;
  if (kind === 'cloze' && cardIndexes('cloze', front).length === 0) return null;
  return { front, back, hint: hint === '' ? null : hint };
}

interface ValidNote {
  readonly topicId: string;
  readonly kind: NoteKind;
  readonly clean: CleanNote;
}

function validateNote(ctx: Context, input: unknown): ValidNote | 'invalid' | 'not_found' {
  const note = typeof input === 'object' && input !== null ? (input as Partial<NoteInput>) : {};
  if (note.kind !== 'basic' && note.kind !== 'cloze') return 'invalid';
  const clean = cleanNote(note.kind, note);
  if (!clean || typeof note.topicId !== 'string') return 'invalid';
  if (!findTopic(ctx, note.topicId)) return 'not_found';
  return { topicId: note.topicId, kind: note.kind, clean };
}

function insertNote(ctx: Context, actor: Member, note: ValidNote, system: boolean): NoteRow {
  const id = ctx.ids.next();
  const now = nowIso(ctx);
  const ownerId = system ? null : actor.id;
  ctx.sql.run(
    'INSERT INTO notes (id, topic_id, owner_id, kind, front, back, hint, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    note.topicId,
    ownerId,
    note.kind,
    note.clean.front,
    note.clean.back,
    note.clean.hint,
    now,
    now,
  );
  for (const index of cardIndexes(note.kind, note.clean.front)) {
    ctx.sql.run('INSERT INTO cards (id, note_id, cloze_index) VALUES (?, ?, ?)', ctx.ids.next(), id, index);
  }
  return { id, topic_id: note.topicId, owner_id: ownerId, kind: note.kind, ...note.clean };
}

export function createNote(ctx: Context, actor: Member, input: Input): CommandResult<NoteView> {
  const note = validateNote(ctx, input);
  if (typeof note === 'string') return failure(note);
  const system = writesSystemCards(actor, input.system === true);
  return { ok: true, value: toNoteView(ctx, actor, insertNote(ctx, actor, note, system)), changed: ['cards'] };
}

const MAX_BATCH = 500;

/** All or none: every note is checked before the first is written. */
export function createNotes(ctx: Context, actor: Member, input: Input): CommandResult<NoteView[]> {
  if (!Array.isArray(input.notes) || input.notes.length === 0 || input.notes.length > MAX_BATCH) return failure('invalid');
  const valid: ValidNote[] = [];
  for (const raw of input.notes as unknown[]) {
    const note = validateNote(ctx, raw);
    if (typeof note === 'string') return failure(note);
    valid.push(note);
  }
  const system = writesSystemCards(actor, input.system === true);
  return { ok: true, value: valid.map((n) => toNoteView(ctx, actor, insertNote(ctx, actor, n, system))), changed: ['cards'] };
}

export function updateNote(ctx: Context, actor: Member, input: Input): CommandResult<NoteView> {
  const note = findVisibleNote(ctx, actor, input.noteId);
  if (!note) return failure('not_found');
  if (note.owner_id !== null && note.owner_id !== actor.id) return failure('not_found');
  const clean = cleanNote(note.kind, input);
  if (!clean) return failure('invalid');

  // A user's edit of a system note is their own version; the note stays as the admin wrote it.
  if (note.owner_id === null && !writesSystemCards(actor, input.system === true)) {
    const [system] = ctx.sql.all<{ front: string }>('SELECT front FROM notes WHERE id = ?', note.id);
    if (note.kind === 'cloze' && !samePassages(system.front, clean.front)) return failure('invalid');
    ctx.sql.run(
      `INSERT INTO note_edits (member_id, note_id, front, back, hint, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (member_id, note_id) DO UPDATE SET front = excluded.front, back = excluded.back, hint = excluded.hint, updated_at = excluded.updated_at`,
      actor.id,
      note.id,
      clean.front,
      clean.back,
      clean.hint,
      nowIso(ctx),
    );
    return { ok: true, value: toNoteView(ctx, actor, { ...note, ...clean }), changed: ['cards'] };
  }

  ctx.sql.run('UPDATE notes SET front = ?, back = ?, hint = ?, updated_at = ? WHERE id = ?', clean.front, clean.back, clean.hint, nowIso(ctx), note.id);

  // A cloze keeps the card of every passage still there; a new passage gets a card (or brings an
  // old one back), a passage gone retires its card. Cards are never deleted: they hold history.
  if (note.kind === 'cloze') {
    const wanted = cardIndexes('cloze', clean.front);
    const existing = ctx.sql.all<{ id: string; cloze_index: number }>('SELECT id, cloze_index FROM cards WHERE note_id = ?', note.id);
    for (const index of wanted) {
      const card = existing.find((c) => c.cloze_index === index);
      if (card) ctx.sql.run('UPDATE cards SET retired = 0 WHERE id = ?', card.id);
      else ctx.sql.run('INSERT INTO cards (id, note_id, cloze_index) VALUES (?, ?, ?)', ctx.ids.next(), note.id, index);
    }
    for (const card of existing.filter((c) => !wanted.includes(c.cloze_index))) {
      ctx.sql.run('UPDATE cards SET retired = 1 WHERE id = ?', card.id);
    }
  }
  return { ok: true, value: toNoteView(ctx, actor, { ...note, ...clean }), changed: ['cards'] };
}

/** The cards are shared, so a user's version of a cloze keeps the system note's passages. */
function samePassages(a: string, b: string): boolean {
  const x = cardIndexes('cloze', a);
  const y = cardIndexes('cloze', b);
  return x.length === y.length && x.every((i) => y.includes(i));
}

export function deleteNote(ctx: Context, actor: Member, input: Input): CommandResult<null> {
  if (!isAdmin(actor)) return failure('forbidden');
  const note = findVisibleNote(ctx, actor, input.noteId);
  if (!note || note.owner_id !== null) return failure('not_found');
  ctx.sql.run('UPDATE notes SET deleted_at = ? WHERE id = ?', nowIso(ctx), note.id);
  return { ok: true, value: null, changed: ['cards', 'study'] };
}

export function suspendCard(ctx: Context, actor: Member, input: Input): CommandResult<null> {
  if (typeof input.cardId !== 'string' || typeof input.suspended !== 'boolean') return failure('invalid');
  const [card] = ctx.sql.all<{ id: string }>(
    `SELECT cards.id FROM cards JOIN notes ON notes.id = cards.note_id WHERE cards.id = ? AND cards.retired = 0 AND ${VISIBLE}`,
    input.cardId,
    actor.id,
  );
  if (!card) return failure('not_found');
  setSuspended(ctx, actor.id, card.id, input.suspended);
  return { ok: true, value: null, changed: ['study'] };
}
