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
      if (event.key === 'Escape') onClose();
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
