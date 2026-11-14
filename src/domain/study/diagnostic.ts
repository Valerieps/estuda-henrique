// Diagnosis rules (docs/spec/diagnostico.md): the mastery of a topic, its coverage, problem cards,
// long-term memory, saved cards and the order of Piores cartas. Pure: the server feeds it cards
// and answers and the screens show what it returns. Mastery and rates are fractions from 0 to 1.
import { isCorrect, type Answer } from './scheduler';
import { addDays, type StudyDay } from './study-day';

/** Below this mastery a topic is highlighted in the termômetro. */
export const WEAK_MASTERY = 0.6;
/** Errei this many times (or more) makes a card a problem card. */
export const PROBLEM_CARD_AGAINS = 6;
/** Long-term memory looks at cards not seen for this many days... */
export const LONG_TERM_GAP_DAYS = 7;
/** ...in answers given in the last this many days (today included)... */
export const LONG_TERM_WINDOW_DAYS = 14;
/** ...and only shows from this many answers on. */
export const LONG_TERM_MIN_ANSWERS = 20;
/** A saved card is one answered right after this many days or more without being seen. */
export const SAVED_GAP_DAYS = 21;

/** What the rules need to know about one card of one member. */
export interface DiagnosticCard {
  readonly cardId: string;
  readonly topicId: string;
  /** Chance of recalling it today, 0 to 1; null while the card is new (never studied). */
  readonly mastery: number | null;
  readonly suspended: boolean;
  /** How many times the member pressed Errei on it, in any session. */
  readonly againCount: number;
}

/** Studied and not suspended: the cards the mastery of a topic is made of. */
function counted<T extends DiagnosticCard>(cards: readonly T[]): T[] {
  return cards.filter((c) => !c.suspended);
}

/**
 * The mastery of a topic: the average mastery of its studied cards, or null with none ("—", never 0%).
 */
export function topicMastery(cards: readonly DiagnosticCard[]): number | null {
  const studied = counted(cards).filter((c) => c.mastery !== null);
  if (studied.length === 0) return null;
  return studied.reduce((sum, c) => sum + (c.mastery as number), 0) / studied.length;
}

/** X of Y cards of the topic already seen; suspended cards count in neither. */
export function topicCoverage(cards: readonly DiagnosticCard[]): { readonly seen: number; readonly total: number } {
  const active = counted(cards);
  return { seen: active.filter((c) => c.mastery !== null).length, total: active.length };
}

export function isWeak(mastery: number | null): boolean {
  return mastery !== null && mastery < WEAK_MASTERY;
}

export function isProblemCard(againCount: number): boolean {
  return againCount >= PROBLEM_CARD_AGAINS;
}

/** Weakest first; a topic with no mastery yet goes last; ties keep their incoming order. */
export function rankTopics<T extends { readonly mastery: number | null }>(topics: readonly T[]): T[] {
  return topics
    .map((topic, index) => ({ topic, index }))
    .sort((a, b) => {
      if (a.topic.mastery === null || b.topic.mastery === null) {
        if (a.topic.mastery === b.topic.mastery) return a.index - b.index;
        return a.topic.mastery === null ? 1 : -1;
      }
      return a.topic.mastery - b.topic.mastery || a.index - b.index;
    })
    .map((x) => x.topic);
}

/**
 * The order of the cards of one topic in Piores cartas: problem cards first, then the others, each
 * group from the lowest mastery to the highest. Only studied, unsuspended cards are listed.
 */
export function orderWorstCards<T extends DiagnosticCard>(cards: readonly T[]): T[] {
  return counted(cards)
    .filter((c) => c.mastery !== null)
    .sort((a, b) => {
      const problem = Number(isProblemCard(b.againCount)) - Number(isProblemCard(a.againCount));
      return problem || (a.mastery as number) - (b.mastery as number);
    });
}

// ---- Tópico: filters and search ----

export type TopicFilter = 'all' | 'new' | 'suspended' | 'problem';

interface TopicListCard extends DiagnosticCard {
  readonly text: string;
}

function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * The cards of the Tópico list for a filter and a search. New: never studied and not suspended.
 * Problem: six or more Errei. The search ignores case and accents and looks at the text of the card.
 */
export function filterTopicCards<T extends TopicListCard>(cards: readonly T[], filter: TopicFilter, search: string): T[] {
  const needle = plain(search.trim());
  return cards.filter((c) => {
    if (filter === 'new' && !(c.mastery === null && !c.suspended)) return false;
    if (filter === 'suspended' && !c.suspended) return false;
    if (filter === 'problem' && !isProblemCard(c.againCount)) return false;
    return needle === '' || plain(c.text).includes(needle);
  });
}

// ---- Long-term memory and saved cards ----

/** One answer, in the order it was given. */
export interface AnswerRecord {
  readonly cardId: string;
  readonly answer: Answer;
  readonly day: StudyDay;
  /** Answered in a training session (Treino); only Revisão sessions count for long-term memory. */
  readonly training: boolean;
}

/** An answer to a card the member had seen before, and how long it had been. */
export interface RecallEvent {
  readonly cardId: string;
  readonly day: StudyDay;
  /** Days since the card's previous answer, by study day, in any session. */
  readonly gapDays: number;
  readonly correct: boolean;
  readonly training: boolean;
}

/** Whole days between two study days. */
export function daysBetween(from: StudyDay, to: StudyDay): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/** The recall events of a history in answer order; a card's first answer is not one. */
export function recallEvents(history: readonly AnswerRecord[]): RecallEvent[] {
  const lastSeen = new Map<string, StudyDay>();
  const events: RecallEvent[] = [];
  for (const record of history) {
    const previous = lastSeen.get(record.cardId);
    if (previous !== undefined) {
      events.push({
        cardId: record.cardId,
        day: record.day,
        gapDays: daysBetween(previous, record.day),
        correct: isCorrect(record.answer),
        training: record.training,
      });
    }
    lastSeen.set(record.cardId, record.day);
  }
  return events;
}

export interface LongTermMemory {
  /** Answers in the window that count. */
  readonly answers: number;
  /** The share right, 0 to 1; null until there are enough answers. */
  readonly rate: number | null;
}

/**
 * The share of right first answers to cards not seen for 7 days or more, in the last 14 days, in
 * Revisão sessions only. The first answer is the one that comes after the gap: the answers that
 * follow it on the same day have a gap of zero.
 */
export function longTermMemory(events: readonly RecallEvent[], today: StudyDay): LongTermMemory {
  const from = addDays(today, -(LONG_TERM_WINDOW_DAYS - 1));
  const counting = events.filter((e) => !e.training && e.gapDays >= LONG_TERM_GAP_DAYS && e.day >= from && e.day <= today);
  const rate = counting.length >= LONG_TERM_MIN_ANSWERS ? counting.filter((e) => e.correct).length / counting.length : null;
  return { answers: counting.length, rate };
}

/** How many cards he has already answered right after 21 days or more without seeing them. */
export function savedCards(events: readonly RecallEvent[]): number {
  return new Set(events.filter((e) => e.correct && e.gapDays >= SAVED_GAP_DAYS).map((e) => e.cardId)).size;
}
