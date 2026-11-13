import type { ReactNode } from 'react';

/**
 * A message about the screen as a whole. `error` interrupts screen readers (role alert);
 * `info` waits its turn (role status).
 */
export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error'; children: ReactNode }) {
  return (
    <p className={tone === 'error' ? 'notice danger' : 'notice'} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
