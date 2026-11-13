// The study day (docs/spec/estudo.md, "Que cartas entram"): it turns at midnight in Brasília,
// whatever the device's time zone. The server computes it from its Clock; days are 'YYYY-MM-DD'.

export const STUDY_TIME_ZONE = 'America/Sao_Paulo';

/** A calendar day, 'YYYY-MM-DD', in the study time zone. */
export type StudyDay = string;

const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: STUDY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The study day an instant falls on. */
export function studyDay(instant: Date): StudyDay {
  const parts = Object.fromEntries(DAY_FORMAT.formatToParts(instant).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isStudyDay(value: unknown): value is StudyDay {
  return typeof value === 'string' && DAY_PATTERN.test(value) && toUtcNoon(value).toISOString().startsWith(value);
}

/** The day `days` after `day` (negative goes back). */
export function addDays(day: StudyDay, days: number): StudyDay {
  const date = toUtcNoon(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Day of the week: 0 = Sunday ... 6 = Saturday (the rest days in Ajustes use it). */
export function weekday(day: StudyDay): number {
  return toUtcNoon(day).getUTCDay();
}

/** The Monday that opens `day`'s week: the key of the weekly topic snapshots. */
export function weekStart(day: StudyDay): StudyDay {
  return addDays(day, -((weekday(day) + 6) % 7));
}

/**
 * The first instant of the study day after `instant`'s: what "due today" means is
 * `due < endOfStudyDay(now)`.
 */
export function endOfStudyDay(instant: Date): Date {
  const next = addDays(studyDay(instant), 1);
  // Start from the latest UTC offset Brasília has used (-02:00, old summer time) and walk forward
  // to the first minute that already falls on the next day.
  let candidate = new Date(`${next}T02:00:00Z`).getTime();
  const step = 15 * 60 * 1000;
  while (studyDay(new Date(candidate)) !== next) candidate += step;
  while (studyDay(new Date(candidate - step)) === next) candidate -= step;
  return new Date(candidate);
}

function toUtcNoon(day: StudyDay): Date {
  return new Date(`${day}T12:00:00Z`);
}
