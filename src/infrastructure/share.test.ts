import { describe, expect, it, vi } from 'vitest';
import { shareText } from './share';

describe('shareText', () => {
  it('uses the share sheet when present', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await shareText('oi', { share, clipboard: { writeText } })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'oi' });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies to the clipboard when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareText('oi', { clipboard: { writeText } })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('oi');
  });

  it('does not copy when he closes the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'));
    const writeText = vi.fn();
    expect(await shareText('oi', { share, clipboard: { writeText } })).toBe('failed');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to the clipboard when sharing fails otherwise', async () => {
    const share = vi.fn().mockRejectedValue(new Error('nope'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareText('oi', { share, clipboard: { writeText } })).toBe('copied');
  });

  it('fails when neither exists', async () => {
    expect(await shareText('oi', {})).toBe('failed');
  });
});
