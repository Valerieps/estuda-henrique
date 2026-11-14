// The contract between the app and the server: query and command names, inputs and outputs.
// Types only. The server imports it with `import type`, so nothing here runs on either side.
import type { Role } from '../domain/group/roles';
import type { NoteKind } from '../domain/study/cloze';
import type { Answer, SchedulingState } from '../domain/study/scheduler';

export interface MemberView {
  readonly id: string;
  readonly name: string;
  readonly photoUrl: string | null;
  readonly roles: readonly Role[];
}

/** A row of the members screen (admins only). */
export interface MemberListItem extends MemberView {
  readonly email?: string;
}

export interface MeView extends MemberView {
  readonly email: string;
}

export type InviteState = 'pending' | 'accepted' | 'revoked';

export interface InviteView {
  readonly email: string;
  readonly state: InviteState;
  readonly invitedByName: string;
  readonly createdAt: string;
  readonly acceptedAt: string | null;
}

export interface TopicView {
  readonly id: string;
  readonly name: string;
  readonly position: number;
}

export interface SubjectView {
  readonly id: string;
  readonly name: string;
  readonly topics: readonly TopicView[];
}

/** One card of a note; `suspended` is the reader's own (a system card suspended stays for the others). */
export interface CardView {
  readonly id: string;
  readonly clozeIndex: number;
  readonly suspended: boolean;
}

export interface NoteView {
  readonly id: string;
  readonly topicId: string;
  /** `system`: written by an admin. `personal`: the reader's own. */
  readonly origin: 'system' | 'personal';
  readonly kind: NoteKind;
  readonly front: string;
  readonly back: string;
  readonly hint: string | null;
  readonly cards: readonly CardView[];
}

export interface NoteInput {
  readonly topicId: string;
  readonly kind: NoteKind;
  readonly front: string;
  readonly back?: string;
  readonly hint?: string | null;
}

/** One day of a topic's mastery, 0 to 1: a point of the termômetro's minilinha. */
export interface TrendPoint {
  readonly day: string;
  readonly mastery: number;
}

/** A topic in the termômetro. `mastery` is 0 to 1, or null when no card was studied yet ("—"). */
export interface ThermometerTopic {
  readonly id: string;
  readonly name: string;
  readonly mastery: number | null;
  /** Below 60%: shown highlighted. */
  readonly weak: boolean;
  /** Cards seen and cards in the topic, suspended ones not counted. */
  readonly seen: number;
  readonly total: number;
  /** Snapshots of the last 4 weeks, oldest first. */
  readonly trend: readonly TrendPoint[];
}

/** The termômetro and the line above it in Hoje. */
export interface Thermometer {
  /** Weakest first; topics with no mastery yet last. */
  readonly topics: readonly ThermometerTopic[];
  /** Share right of the cards not seen for 7+ days in the last 14 days; null before 20 answers. */
  readonly longTermRate: number | null;
  readonly longTermAnswers: number;
  /** Cards he already got right after 21 days or more without seeing them. */
  readonly savedCards: number;
}

/** A row of Piores cartas. Cloze cards show `front` with the passage `clozeIndex` hidden. */
export interface WorstCard {
  readonly cardId: string;
  readonly noteId: string;
  readonly origin: 'system' | 'personal';
  readonly kind: NoteKind;
  readonly front: string;
  readonly clozeIndex: number;
  /** 0 to 1. */
  readonly mastery: number;
  /** How many times he pressed Errei on it. */
  readonly againCount: number;
  /** Six or more Errei: marked, with the suggestion to rewrite it. */
  readonly problem: boolean;
  /** The study day of the last answer, or null. */
  readonly lastSeenDay: string | null;
}

export interface WorstCardsGroup {
  readonly topicId: string;
  readonly topicName: string;
  readonly mastery: number | null;
  readonly cards: readonly WorstCard[];
}

/** The cards a Véspera takes from the chosen topics. */
export interface ExamCards {
  readonly cardIds: string[];
  readonly seen: number;
  readonly fresh: number;
}

export type StudyKind = 'review' | 'cram' | 'retry' | 'selected';

/** A card in a study queue, with what the front and back need and the reader's own FSRS state. */
export interface StudyCard {
  readonly id: string;
  readonly noteId: string;
  readonly topicId: string;
  readonly topicName: string;
  readonly kind: NoteKind;
  readonly clozeIndex: number;
  readonly front: string;
  readonly back: string;
  readonly hint: string | null;
  readonly state: SchedulingState;
}

/** A study session just opened, with its cards in the order they come. */
export interface StudySessionView {
  readonly sessionId: string;
  readonly kind: StudyKind;
  /** Training does not count toward accuracy (docs/spec/estudo.md). */
  readonly training: boolean;
  readonly cards: readonly StudyCard[];
}

/** Reads: `POST /api/query/<name>`. They never change anything. */
export interface Queries {
  /** Subjects with their topics in order. */
  subjects: { input: Record<string, never>; output: SubjectView[] };
  /** The notes of a topic the reader may see: the system's and their own. */
  notes: { input: { topicId: string }; output: NoteView[] };
  /** The reader's own termômetro, long-term memory and saved cards. */
  thermometer: { input: Record<string, never>; output: Thermometer };
  /** The reader's own worst cards by topic, weakest topic first; `topicId` keeps one topic's group. */
  worstCards: { input: { topicId?: string }; output: WorstCardsGroup[] };
  /** The reader's own cards for a Véspera: all of the topics' cards, or the 30 seen ones with the lowest mastery. */
  examCards: { input: { topicIds: string[]; scope: 'all' | 'weakest' }; output: ExamCards };
  me: { input: Record<string, never>; output: MeView };
  /** Admins only. */
  members: { input: Record<string, never>; output: MemberListItem[] };
  /** Admins only. */
  invites: { input: Record<string, never>; output: InviteView[] };
}

/** Writes: `POST /api/command/<name>`. Each runs alone, in one transaction. */
export interface Commands {
  'invite.create': { input: { email: string }; output: InviteView };
  'invite.revoke': { input: { email: string }; output: null };
  'member.setRoles': { input: { memberId: string; roles: Role[] }; output: MemberView };
  /** Admins; never oneself, so the last admin stays. */
  'member.remove': { input: { memberId: string }; output: null };
  'member.rename': { input: { name: string }; output: MeView };
  /** Admins. */
  'topic.create': { input: { subjectId: string; name: string }; output: TopicView };
  /** Admins. */
  'topic.rename': { input: { topicId: string; name: string }; output: TopicView };
  /** Admins; `topicIds` is the subject's whole new order. */
  'topic.reorder': { input: { subjectId: string; topicIds: string[] }; output: null };
  /** An admin writes a system note; anyone else, a personal one. */
  'note.create': { input: NoteInput; output: NoteView };
  /** Several notes at once (Colar várias), all or none. */
  'note.createMany': { input: { notes: NoteInput[] }; output: NoteView[] };
  /** Front, back and hint; the kind stays. Anyone edits a system note; only the owner, a personal one. */
  'note.update': { input: { noteId: string; front: string; back?: string; hint?: string | null }; output: NoteView };
  /** Admins, system notes only. Hides the note; nobody's study history changes. */
  'note.delete': { input: { noteId: string }; output: null };
  /** Only the reader's own state of the card. */
  'card.suspend': { input: { cardId: string; suspended: boolean }; output: null };
  /**
   * Opens a study session. `review` builds the day's queue (learning, due, then new) and takes an
   * optional `limit` (Só 5 cartas); the other kinds are training and take `cardIds`. Null when
   * there is nothing to study.
   */
  'study.start': { input: { kind: StudyKind; limit?: number; cardIds?: string[] }; output: StudySessionView | null };
  /** Records an answer; the output is the card's new state. */
  'study.answer': { input: { sessionId: string; cardId: string; answer: Answer }; output: { state: SchedulingState } };
  /** Undoes the session's last answer; the output is the card with its state before it. */
  'study.undo': { input: { sessionId: string }; output: { cardId: string; state: SchedulingState } };
  'study.end': { input: { sessionId: string }; output: null };
}

export type QueryName = keyof Queries;
export type CommandName = keyof Commands;

/**
 * What a live message says changed; the screens that show it refetch. Every open app gets every
 * message, so a topic names a kind of data, never whose: `study` and `settings` are private, and a
 * refetch only ever returns the reader's own (ADR-009).
 * - `subjects`: subjects and topics. `cards`: notes and cards (system and personal).
 * - `study`: card states, answers and study sessions. `settings`: the study settings (Ajustes).
 */
export type Topic = 'me' | 'members' | 'invites' | 'subjects' | 'cards' | 'study' | 'settings';

export interface LiveMessage {
  readonly type: 'changed';
  readonly topics: readonly Topic[];
}

export type ApiError = 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid' | 'conflict' | 'last_admin' | 'unavailable';

export type ApiResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ApiError };
