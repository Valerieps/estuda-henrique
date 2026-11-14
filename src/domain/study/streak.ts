// The streak (docs/spec/meta-e-ofensiva.md, "Ofensiva"): consecutive study days. A rest day of the
// week never breaks it. Pure rules; the server feeds in which days counted.
import { addDays, weekday, type StudyDay } from './study-day';

/** How many days back the Ofensiva sheet's calendar goes. */
export const CALENDAR_DAYS = 28;

const MAX_LOOKBACK = 400;

export interface Streak {
  /** Consecutive counted days, rest days skipped (counted when he studied on them). */
  readonly days: number;
  /** Today already counted: the flame is lit. */
  readonly litToday: boolean;
  /**
   * The day that broke the streak when it can be fixed: the last study day he missed, right after
   * a streak and with nothing but rest days between it and today. Null when nothing is fixable.
   */
  readonly repairableDay: StudyDay | null;
}

export interface CalendarDay {
  readonly day: StudyDay;
  readonly counted: boolean;
  readonly rest: boolean;
}

/** The streak on `today`, given the days that counted and the weekdays he rests (0 = Sunday). */
export function computeStreak(counted: ReadonlySet<StudyDay>, restDays: readonly number[], today: StudyDay): Streak {
  const isRest = (day: StudyDay) => restDays.includes(weekday(day));
  const litToday = counted.has(today);
  let days = litToday ? 1 : 0;
  let day = addDays(today, -1);
  let missed: StudyDay | null = null;
  for (let i = 0; i < MAX_LOOKBACK; i++, day = addDays(day, -1)) {
    if (counted.has(day)) days++;
    else if (!isRest(day)) {
      missed = day;
      break;
    }
  }
  return { days, litToday, repairableDay: missed && hadStreakBefore(counted, isRest, missed) ? missed : null };
}

/** Whether the last study day before `missed` counted: fixing `missed` joins two runs. */
function hadStreakBefore(counted: ReadonlySet<StudyDay>, isRest: (day: StudyDay) => boolean, missed: StudyDay): boolean {
  let day = addDays(missed, -1);
  for (let i = 0; i < 7 && isRest(day) && !counted.has(day); i++) day = addDays(day, -1);
  return counted.has(day);
}

/** The last `CALENDAR_DAYS` days up to `today`, oldest first. */
export function streakCalendar(counted: ReadonlySet<StudyDay>, restDays: readonly number[], today: StudyDay): CalendarDay[] {
  return Array.from({ length: CALENDAR_DAYS }, (_, i) => {
    const day = addDays(today, i - (CALENDAR_DAYS - 1));
    return { day, counted: counted.has(day), rest: restDays.includes(weekday(day)) };
  });
}
