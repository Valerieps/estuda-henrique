import { describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  WorkerEntrypoint: class {
    constructor(
      public ctx: unknown,
      public env: unknown,
    ) {}
  },
}));
vi.mock('./group-object', () => ({ Group: class {}, SESSION_HASH_HEADER: 'x-session-hash' }));

import worker, { Cron, runCron } from './worker';

function fakeEnv() {
  const tick = vi.fn(async () => {});
  const env = { GROUP: { idFromName: () => 'id', get: () => ({ tick }) } };
  return { env: env as never, tick };
}

describe('cron entry points', () => {
  const ctx = {} as ExecutionContext;

  it('runCron ticks the group', async () => {
    const { env, tick } = fakeEnv();
    await runCron(env, ctx);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('scheduled() does the same as runCron', async () => {
    const { env, tick } = fakeEnv();
    await worker.scheduled!({} as ScheduledController, env, ctx);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('Cron.tick() does the same as runCron', async () => {
    const { env, tick } = fakeEnv();
    const entry = new (Cron as unknown as new (ctx: unknown, env: unknown) => Cron)(ctx, env);
    await entry.tick();
    expect(tick).toHaveBeenCalledTimes(1);
  });
});
