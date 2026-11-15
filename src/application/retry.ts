import type { ApiResult } from './api-contract';

/** Waits between the attempts after a dropped connection, in ms. */
export const RETRY_DELAYS_MS: readonly number[] = [600, 1500];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs a command and, only when the connection dropped ('unavailable'), tries again after each
 * delay. A refusal from the server (not found, forbidden...) is final and returns at once.
 */
export async function retryUnavailable<T>(
  run: () => Promise<ApiResult<T>>,
  delays: readonly number[] = RETRY_DELAYS_MS,
  wait: (ms: number) => Promise<void> = sleep,
): Promise<ApiResult<T>> {
  let result = await run();
  for (const delay of delays) {
    if (result.ok || result.error !== 'unavailable') return result;
    await wait(delay);
    result = await run();
  }
  return result;
}
