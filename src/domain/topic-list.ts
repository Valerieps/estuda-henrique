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
 * puts the lowest mastery first and new topics (no mastery yet) last; ties keep the course order.
 */
export function arrangeTopics<T extends ArrangeableTopic>(
  topics: readonly T[],
  filter: TopicStateFilter,
  order: TopicOrder,
): T[] {
  const shown = filter === 'all' ? [...topics] : topics.filter((t) => t.state === filter);
  if (order === 'course') return shown;
  return shown.sort((a, b) => rank(a) - rank(b));
}

function rank(topic: ArrangeableTopic): number {
  return topic.mastery === null || topic.state === 'new' ? Number.POSITIVE_INFINITY : topic.mastery;
}

/** How many topics are in each state, for the counts on the filter chips. */
export function countByState(topics: readonly ArrangeableTopic[]): Record<TopicState, number> {
  const counts: Record<TopicState, number> = { new: 0, weak: 0, progress: 0, mastered: 0 };
  for (const t of topics) counts[t.state] += 1;
  return counts;
}
