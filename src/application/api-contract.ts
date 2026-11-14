// The contract between the app and the server: query and command names, inputs and outputs.
// Types only. The server imports it with `import type`, so nothing here runs on either side.
import type { Role } from '../domain/group/roles';
import type { NoteKind } from '../domain/study/cloze';

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

/** Reads: `POST /api/query/<name>`. They never change anything. */
export interface Queries {
  /** Subjects with their topics in order. */
  subjects: { input: Record<string, never>; output: SubjectView[] };
  /** The notes of a topic the reader may see: the system's and their own. */
  notes: { input: { topicId: string }; output: NoteView[] };
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
