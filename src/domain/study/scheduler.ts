// Card scheduling with FSRS (docs/spec/estudo.md, ADR-010). The only file that imports ts-fsrs:
// the rest of the app and the server see `SchedulingState` and `Answer`, never the library's types.
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';

/** The three buttons. There is no "Fácil" (docs/spec/estudo.md). */
export type Answer = 'again' | 'hard' | 'good';

export const ANSWERS: readonly Answer[] = ['again', 'hard', 'good'];

export function isAnswer(value: unknown): value is Answer {
  return typeof value === 'string' && (ANSWERS as readonly string[]).includes(value);
}

/** Acertei and Acertei com esforço count as correct; Errei does not. */
export function isCorrect(answer: Answer): boolean {
  return answer !== 'again';
}

export type CardStage = 'new' | 'learning' | 'review' | 'relearning';

/** A card's FSRS state for one member, as stored in `card_states` and in `reviews.previous_state`. */
export interface SchedulingState {
  readonly stage: CardStage;
  /** ISO instant. */
  readonly due: string;
  readonly stability: number;
  readonly difficulty: number;
  readonly scheduledDays: number;
  readonly learningSteps: number;
  readonly reps: number;
  readonly lapses: number;
  /** ISO instant, or null before the first answer. */
  readonly lastReview: string | null;
}

/** Default FSRS parameters, 90% desired retention, Errei steps of 1 and 10 minutes, no fuzz. */
const scheduler = fsrs(
  generatorParameters({
    request_retention: 0.9,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['1m', '10m'],
    enable_fuzz: false,
    enable_short_term: true,
  }),
);

const GRADE: Record<Answer, Grade> = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good };

const STAGE: Record<State, CardStage> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

const STATE: Record<CardStage, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

/** The state of a card the member has never answered. */
export function newCardState(now: Date): SchedulingState {
  return fromCard(createEmptyCard(now));
}

/** The state after answering `answer` at `now`. */
export function schedule(state: SchedulingState, answer: Answer, now: Date): SchedulingState {
  return fromCard(scheduler.next(toCard(state, now), now, GRADE[answer]).card);
}

/** The probability of recalling the card at `now`, from 0 to 1 (0 for a new card). */
export function retrievability(state: SchedulingState, now: Date): number {
  if (state.stage === 'new') return 0;
  return scheduler.get_retrievability(toCard(state, now), now, false);
}

function fromCard(card: Card): SchedulingState {
  return {
    stage: STAGE[card.state],
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

function toCard(state: SchedulingState, now: Date): Card {
  const lastReview = state.lastReview ? new Date(state.lastReview) : undefined;
  const elapsedDays = lastReview ? Math.max(0, Math.floor((now.getTime() - lastReview.getTime()) / 86_400_000)) : 0;
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: STATE[state.stage],
    last_review: lastReview,
  };
}
