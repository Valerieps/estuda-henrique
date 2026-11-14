import type { ReactNode } from 'react';

/** A screen with nothing to show yet: a title and one line saying what will be here. */
export function EmptyState({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <section className="empty-state">
      <h1>{title}</h1>
      <p className="muted">{text}</p>
      {children}
    </section>
  );
}
