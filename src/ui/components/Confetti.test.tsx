import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Confetti } from './Confetti';

afterEach(() => vi.unstubAllGlobals());

describe('Confetti', () => {
  it('renders decorative pieces', () => {
    const out = renderToStaticMarkup(<Confetti />);
    expect(out).toContain('aria-hidden="true"');
    expect(out.match(/confetti-piece/g)?.length).toBeGreaterThan(5);
  });

  it('renders nothing under prefers-reduced-motion', () => {
    vi.stubGlobal('window', { matchMedia: (query: string) => ({ matches: query.includes('reduce') }) });
    expect(renderToStaticMarkup(<Confetti />)).toBe('');
  });

  it('renders the pieces when the person did not ask for less motion', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    expect(renderToStaticMarkup(<Confetti />)).toContain('confetti-piece');
  });
});
