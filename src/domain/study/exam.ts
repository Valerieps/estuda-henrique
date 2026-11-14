// Véspera: which cards a cram session takes (docs/spec/vespera.md). Pure rules; the server feeds
// them the reader's own cards.
import type { DiagnosticCard } from './diagnostic';

export type ExamScope = 'all' | 'weakest';

/** "As 30 de menor domínio". */
export const EXAM_WEAKEST_COUNT = 30;

export interface ExamSelection {
  /** The cards of the session, in a stable order (the screen shuffles them). */
  readonly cardIds: readonly string[];
  /** How many of the topics' cards he has seen, and how many are new. Suspended ones count in neither. */
  readonly seen: number;
  readonly fresh: number;
}

/**
 * `all`: every card of the chosen topics, new ones included. `weakest`: only the seen ones, the
 * `EXAM_WEAKEST_COUNT` with the lowest mastery (the new ones have none yet). Suspended cards never enter.
 */
export function examSelection(cards: readonly DiagnosticCard[], topicIds: readonly string[], scope: ExamScope): ExamSelection {
  const chosen = new Set(topicIds);
  const active = cards.filter((c) => chosen.has(c.topicId) && !c.suspended);
  const seen = active.filter((c) => c.mastery !== null);
  const fresh = active.length - seen.length;
  const taken =
    scope === 'all'
      ? active
      : [...seen].sort((a, b) => (a.mastery as number) - (b.mastery as number)).slice(0, EXAM_WEAKEST_COUNT);
  return { cardIds: taken.map((c) => c.cardId), seen: seen.length, fresh };
}
