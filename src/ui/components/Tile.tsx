import type { ReactNode } from 'react';
import type { TopicState } from '../../domain/topic-state';
import { Link } from '../router';
import { Icon, type IconName } from './Icon';

/**
 * A block of a two-column grid: an icon, a title and a line of support, tinted by a topic state
 * when it has one. With `to` the whole tile is a link (a 44px target at least); without, a block.
 */
export function Tile({
  icon,
  title,
  support,
  tone,
  to,
  children,
}: {
  icon?: IconName;
  title: string;
  support?: string;
  tone?: TopicState;
  to?: string;
  children?: ReactNode;
}) {
  const body = (
    <>
      {icon ? <Icon name={icon} /> : null}
      <span className="tile-title">{title}</span>
      {support ? <span className="tile-support">{support}</span> : null}
      {children}
    </>
  );
  if (to) {
    return (
      <Link className="tile" to={to} data-tone={tone}>
        {body}
      </Link>
    );
  }
  return (
    <div className="tile" data-tone={tone}>
      {body}
    </div>
  );
}
