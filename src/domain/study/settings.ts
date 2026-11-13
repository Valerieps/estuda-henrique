// Study settings (docs/spec/meta-e-ofensiva.md, Ajustes). The app works with the defaults; the
// member changes them in Ajustes.

/** Default limit of new cards a day (docs/spec/estudo.md). */
export const DEFAULT_NEW_PER_DAY = 10;

export interface StudySettings {
  readonly newPerDay: number;
  /** Rest days of the week, 0 = Sunday ... 6 = Saturday. */
  readonly restDays: readonly number[];
  readonly routineWhen: string | null;
  readonly routineWhere: string | null;
  /** The month ('YYYY-MM') the member last repaired the streak, or null. */
  readonly streakRepairMonth: string | null;
}

export const DEFAULT_STUDY_SETTINGS: StudySettings = {
  newPerDay: DEFAULT_NEW_PER_DAY,
  restDays: [],
  routineWhen: null,
  routineWhere: null,
  streakRepairMonth: null,
};

/** Keeps only valid weekdays, once each, in order. */
export function normalizeRestDays(days: readonly unknown[]): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((d) => days.includes(d));
}
