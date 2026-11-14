import type { ReactNode } from 'react';
import type { TopicState } from '../../domain/topic-state';
import { Icon, type IconName } from './Icon';

/**
 * The screen's highlight: one per screen, full width, above the grid and the chips (docs/UI.md).
 * With `tone` it takes a topic state's colors, so a topic keeps its color from tile to screen.
 */
export function Hero({
  icon,
  title,
  tone,
  children,
}: {
  icon?: IconName;
  title?: string;
  tone?: TopicState;
  children: ReactNode;
}) {
  return (
    <section className="hero" data-tone={tone}>
      {title ? (
        <h2 className="hero-title">
          {icon ? <Icon name={icon} /> : null}
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
