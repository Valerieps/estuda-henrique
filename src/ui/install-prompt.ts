// The browser's "install this app" offer. It fires once, early, so it is caught at load and kept
// until Hoje shows the notice (docs/spec/meta-e-ofensiva.md, "Cartão de aviso").
import { useEffect, useState } from 'react';

interface InstallEvent extends Event {
  prompt(): Promise<unknown>;
}

let offer: InstallEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    offer = event as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    offer = null;
    listeners.forEach((l) => l());
  });
}

/** Whether the app can be installed now, and how. */
export function useInstall(): { canInstall: boolean; install: () => void } {
  const [, setTick] = useState(0);
  useEffect(() => {
    const update = () => setTick((n) => n + 1);
    listeners.add(update);
    return () => void listeners.delete(update);
  }, []);
  return {
    canInstall: offer !== null,
    install: () => {
      void offer?.prompt();
      offer = null;
      listeners.forEach((l) => l());
    },
  };
}
