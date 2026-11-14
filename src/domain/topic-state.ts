import { WEAK_MASTERY } from './study/diagnostic';

/**
 * Where a topic stands, the same in every screen (docs/UI.md): `new` before any card of it was
 * seen, `weak` under WEAK_MASTERY, `mastered` from MASTERED_MASTERY up once MASTERED_COVERAGE of
 * its cards were seen, `progress` in between (docs/spec/diagnostico.md). A pure function of the
 * topic's mastery (0 to 1, null when not studied yet), its cards seen and its cards in all.
 */
export type TopicState = 'new' | 'weak' | 'progress' | 'mastered';

export const MASTERED_MASTERY = 0.9;

/** Share of the topic's cards that must have been seen before it can be mastered. */
export const MASTERED_COVERAGE = 0.8;

export function topicState(mastery: number | null, seen: number, total: number): TopicState {
  if (mastery === null || seen <= 0) return 'new';
  if (mastery < WEAK_MASTERY) return 'weak';
  if (mastery >= MASTERED_MASTERY && seen >= MASTERED_COVERAGE * total) return 'mastered';
  return 'progress';
}
