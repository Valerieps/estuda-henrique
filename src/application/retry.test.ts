import { describe, expect, it, vi } from 'vitest';
import type { ApiResult } from './api-contract';
import { retryUnavailable } from './retry';

const down: ApiResult<number> = { ok: false, error: 'unavailable' };
const fine: ApiResult<number> = { ok: true, value: 1 };
const noWait = () => Promise.resolve();

describe('retryUnavailable', () => {
  it('returns the first success without waiting', async () => {
    const run = vi.fn().mockResolvedValue(fine);
    expect(await retryUnavailable(run, [1, 1], noWait)).toEqual(fine);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('tries again after a dropped connection', async () => {
    const run = vi.fn().mockResolvedValueOnce(down).mockResolvedValueOnce(fine);
    expect(await retryUnavailable(run, [1, 1], noWait)).toEqual(fine);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('gives up after the last delay', async () => {
    const run = vi.fn().mockResolvedValue(down);
    expect(await retryUnavailable(run, [1, 1], noWait)).toEqual(down);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('does not retry a refusal from the server', async () => {
    const run = vi.fn().mockResolvedValue({ ok: false, error: 'not_found' });
    expect(await retryUnavailable(run, [1, 1], noWait)).toEqual({ ok: false, error: 'not_found' });
    expect(run).toHaveBeenCalledTimes(1);
  });
});
