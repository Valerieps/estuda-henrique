import { useEffect, useRef, type ReactNode } from 'react';
import { strings } from '../../domain/strings';
import { Button } from './Button';

/**
 * A panel that slides over the current screen and gives it back when closed (Escape, the scrim
 * or Fechar). Focus moves into it while it is open and returns to what opened it.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return onClose();
      if (event.key !== 'Tab' || !ref.current) return;
      // Keep Tab inside the dialog: it is modal, so the screen behind is out of reach.
      const items = [...ref.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea')].filter((el) => !el.hasAttribute('disabled'));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === ref.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div className="sheet stack" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <h2>{title}</h2>
        {children}
        <Button variant="secondary" onClick={onClose}>
          {strings.create.close}
        </Button>
      </div>
    </>
  );
}
