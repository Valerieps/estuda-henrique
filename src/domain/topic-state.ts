import { WEAK_MASTERY } from './study/diagnostic';

/**
 * Where a topic stands, the same in every screen (docs/UI.md): `new` before any card of it was
 * seen, `weak` under WEAK_MASTERY, `mastered` from MASTERED_MASTERY up, `progress` in between.
 * A pure function of the topic's mastery (0 to 1, null when not studied yet) and its cards seen.
 */
export type TopicState = 'new' | 'weak' | 'progress' | 'mastered';

export const MASTERED_MASTERY = 0.9;

export function topicState(mastery: number | null, seen: number): TopicState {
  if (mastery === null || seen <= 0) return 'new';
  if (mastery < WEAK_MASTERY) return 'weak';
  if (mastery >= MASTERED_MASTERY) return 'mastered';
  return 'progress';
}
