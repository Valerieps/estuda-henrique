// The queue of a study session on the device (docs/spec/estudo.md, "Responder"). The server
// decides which cards enter; this only says what happens to the queue after each answer.
import { schedule, type Answer, type SchedulingState } from './scheduler';

/** How many cards come before an Errei card comes back (fewer when the queue is shorter). */
export const AGAIN_GAP = 3;


/**
 * The queue after answering its first card. Errei sends the card back, with its new state, after
 * `AGAIN_GAP` others; Acertei com esforço and Acertei take it out of the session.
 */
export function afterAnswer<C extends { readonly state: SchedulingState }>(queue: readonly C[], answer: Answer, now: Date): C[] {
  const [first, ...rest] = queue;
  if (!first || answer !== 'again') return rest;
  const again = { ...first, state: schedule(first.state, answer, now) };
  const at = Math.min(AGAIN_GAP, rest.length);
  return [...rest.slice(0, at), again, ...rest.slice(at)];
}

/** When each button would bring the first card back, from its current state. */
export function returnDelays(state: SchedulingState, now: Date): Record<Answer, number> {
  const delay = (answer: Answer) => Math.max(0, new Date(schedule(state, answer, now).due).getTime() - now.getTime());
  return { again: delay('again'), hard: delay('hard'), good: delay('good') };
}
