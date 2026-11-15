// The topic forecast (ADR-014, docs/spec/diagnostico.md "Tópico"): what the topic's mastery will be
// over the next days if the member only does the reviews that fall due, answering Acertei. Pure.
import { retrievability, schedule, type SchedulingState } from './scheduler';
import { addDays, type StudyDay } from './study-day';

export const FORECAST_DAYS = 7;
/** A card can fall due again the same day (learning steps); this many reviews per day at most. */
const MAX_REVIEWS_PER_DAY = 4;

export interface TopicForecast {
  /** The topic's average mastery on each of the next days, starting tomorrow. */
  readonly dailyMastery: readonly number[];
  /** The lowest of `dailyMastery`. */
  readonly lowest: number;
}

/** Midday in Brasília (UTC-3, no daylight saving): the moment each day is evaluated at. */
function middayOf(day: StudyDay): Date {
  return new Date(`${day}T15:00:00.000Z`);
}

function dueDay(state: SchedulingState): StudyDay {
  // The study day of an instant in Brasília, without Intl: shift by the fixed offset.
  return new Date(new Date(state.due).getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Forecast for the studied, not suspended cards of one topic. New cards are ignored (the caller may
 * pass them; they are skipped). Returns null when no card was studied: there is nothing to forecast.
 */
export function forecastTopic(cards: readonly SchedulingState[], today: StudyDay, days: number = FORECAST_DAYS): TopicForecast | null {
  let states = cards.filter((c) => c.stage !== 'new');
  if (states.length === 0 || days < 1) return null;
  const dailyMastery: number[] = [];
  for (let i = 1; i <= days; i++) {
    const day = addDays(today, i);
    const noon = middayOf(day);
    states = states.map((state) => {
      let current = state;
      for (let n = 0; n < MAX_REVIEWS_PER_DAY && dueDay(current) <= day; n++) {
        const due = new Date(current.due);
        current = schedule(current, 'good', due > noon ? due : noon);
      }
      return current;
    });
    dailyMastery.push(states.reduce((sum, s) => sum + retrievability(s, noon), 0) / states.length);
  }
  return { dailyMastery, lowest: Math.min(...dailyMastery) };
}
