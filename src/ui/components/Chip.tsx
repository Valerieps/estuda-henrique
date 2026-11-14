import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** A short label with an optional icon, in a row of chips. Tappable when `onClick` is given. */
export function Chip({
  icon,
  children,
  onClick,
  pressed,
}: {
  icon?: IconName;
  children: ReactNode;
  onClick?: () => void;
  pressed?: boolean;
}) {
  const content = (
    <>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </>
  );
  if (!onClick) return <span className="chip">{content}</span>;
  return (
    <button type="button" className="chip tappable" onClick={onClick} aria-pressed={pressed}>
      {content}
    </button>
  );
}
