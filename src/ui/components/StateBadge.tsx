import { strings } from '../../domain/strings';
import type { TopicState } from '../../domain/topic-state';
import { Icon, type IconName } from './Icon';

const ICONS: Record<TopicState, IconName> = {
  new: 'sparkle',
  weak: 'alert',
  progress: 'target',
  mastered: 'crown',
};

/** The icon that stands for a topic state, for tiles and lists that show the state in their own way. */
export function stateIcon(state: TopicState): IconName {
  return ICONS[state];
}

/** A topic's state as a pill: its color, its icon and its name, never color alone (docs/UI.md). */
export function StateBadge({ state }: { state: TopicState }) {
  return (
    <span className="state-badge" data-state={state}>
      <Icon name={ICONS[state]} />
      {strings.components.state[state]}
    </span>
  );
}
