import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** The screen's highlight: one per screen, full width, above the grid and the chips (docs/UI.md). */
export function Hero({ icon, title, children }: { icon?: IconName; title?: string; children: ReactNode }) {
  return (
    <section className="hero">
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
