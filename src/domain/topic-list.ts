import type { TopicState } from './topic-state';

/** Which topics the Matérias grid shows: all of them, or only those in one state. */
export type TopicStateFilter = 'all' | TopicState;

/** The Matérias grid order: the course plan's (as the owner added them) or weakest first. */
export type TopicOrder = 'course' | 'weakest';

interface ArrangeableTopic {
  readonly state: TopicState;
  readonly mastery: number | null;
}

/**
 * Filters and orders a subject's topics for the Matérias grid (docs/spec/cartas.md). `weakest`
 * sorts by state (weak, in progress, new, mastered), then lowest mastery first; ties keep the
 * course order.
 */
export function arrangeTopics<T extends ArrangeableTopic>(
  topics: readonly T[],
  filter: TopicStateFilter,
  order: TopicOrder,
): T[] {
  const shown = filter === 'all' ? [...topics] : topics.filter((t) => t.state === filter);
  if (order === 'course') return shown;
  return shown.sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || (a.mastery ?? 0) - (b.mastery ?? 0));
}

/** Worst first; a new topic has nothing to compare, so it sits after the ones with progress. */
const STATE_RANK: Record<TopicState, number> = { weak: 0, progress: 1, new: 2, mastered: 3 };

/** How many topics are in each state, for the counts on the filter chips. */
export function countByState(topics: readonly ArrangeableTopic[]): Record<TopicState, number> {
  const counts: Record<TopicState, number> = { new: 0, weak: 0, progress: 0, mastered: 0 };
  for (const t of topics) counts[t.state] += 1;
  return counts;
}
