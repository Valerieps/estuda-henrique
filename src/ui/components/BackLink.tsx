import { Link } from '../router';
import { Icon } from './Icon';

/** The way back to the screen above, as a tappable pill with an arrow, not a bare underlined link. */
export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link className="back-link" to={to}>
      <Icon name="back" />
      {children}
    </Link>
  );
}
