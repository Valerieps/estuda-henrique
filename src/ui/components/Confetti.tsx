import './Confetti.css';

/** How many pieces fall; Confetti.css places each one by its position in the list. */
const PIECES = 14;

/** True when the person asked the system for less motion. */
function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Confetti for an emptied day: a handful of colored pieces that fall once and vanish. Only CSS and
 * DOM, decorative (hidden from assistive tech, never catches a tap) and off under
 * prefers-reduced-motion, where it renders nothing.
 */
export function Confetti() {
  if (reducedMotion()) return null;
  return (
    <div className="confetti" aria-hidden="true" data-testid="confetti">
      {Array.from({ length: PIECES }, (_, i) => (
        <span key={i} className="confetti-piece" />
      ))}
    </div>
  );
}
