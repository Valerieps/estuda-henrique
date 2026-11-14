// Hoje, the streak and Ajustes (docs/spec/meta-e-ofensiva.md). Everything is the actor's own
// (ADR-009): the goal comes from their queue, the streak from their sessions.
import type { SettingsView, StreakView, TodayView } from '../../src/application/api-contract';
import {
  MAX_NEW_PER_DAY,
  MAX_ROUTINE_LENGTH,
  MIN_NEW_PER_DAY,
  normalizeRestDays,
  type StudySettings,
} from '../../src/domain/study/settings';
import { computeStreak, streakCalendar } from '../../src/domain/study/streak';
import { weekday, type StudyDay } from '../../src/domain/study/study-day';
import { failure, today, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { dailyQueue } from './review';
import { saveStudySettings, studySettings } from './study-store';

type Input = Record<string, unknown>;

/** The days that count for the actor's streak: a finished session with an answer, or a streak day. */
function countedDays(ctx: Context, memberId: string): Set<StudyDay> {
  return new Set(
    ctx.sql
      .all<{ day: string }>(
        `SELECT s.study_day AS day FROM study_sessions s
         WHERE s.member_id = ? AND s.ended_at IS NOT NULL AND EXISTS (SELECT 1 FROM reviews r WHERE r.session_id = s.id)
         UNION SELECT day FROM streak_days WHERE member_id = ?`,
        memberId,
        memberId,
      )
      .map((row) => row.day),
  );
}

function streakView(ctx: Context, memberId: string): StreakView {
  const settings = studySettings(ctx, memberId);
  const day = today(ctx);
  const counted = countedDays(ctx, memberId);
  const streak = computeStreak(counted, settings.restDays, day);
  return {
    days: streak.days,
    litToday: streak.litToday,
    canRepair: streak.repairableDay !== null && settings.streakRepairMonth !== day.slice(0, 7),
    calendar: streakCalendar(counted, settings.restDays, day),
  };
}

export function todayView(ctx: Context, actor: Member): TodayView {
  const settings = studySettings(ctx, actor.id);
  const queue = dailyQueue(ctx, actor, null);
  const newLeft = queue.filter((card) => card.state.stage === 'new').length;
  const [{ finished }] = ctx.sql.all<{ finished: number }>(
    `SELECT COUNT(*) AS finished FROM study_sessions s
     WHERE s.member_id = ? AND s.ended_at IS NOT NULL AND EXISTS (SELECT 1 FROM reviews r WHERE r.session_id = s.id)`,
    actor.id,
  );
  return {
    routineWhen: settings.routineWhen,
    routineWhere: settings.routineWhere,
    restToday: settings.restDays.includes(weekday(today(ctx))),
    reviewsLeft: queue.length - newLeft,
    newLeft,
    hasStudied: finished > 0,
    streak: streakView(ctx, actor.id),
  };
}

function view(settings: StudySettings): SettingsView {
  return { newPerDay: settings.newPerDay, restDays: settings.restDays, routineWhen: settings.routineWhen, routineWhere: settings.routineWhere };
}

export function settingsView(ctx: Context, actor: Member): SettingsView {
  return view(studySettings(ctx, actor.id));
}

/** Trimmed text, or null for empty; undefined when the value is not text (invalid). */
function routineText(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text.length > MAX_ROUTINE_LENGTH ? undefined : text === '' ? null : text;
}

export function updateSettings(ctx: Context, actor: Member, input: Input): CommandResult<SettingsView> {
  const current = studySettings(ctx, actor.id);
  const next = { ...current };
  if (input.newPerDay !== undefined) {
    const n = input.newPerDay;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < MIN_NEW_PER_DAY || n > MAX_NEW_PER_DAY) return failure('invalid');
    next.newPerDay = n;
  }
  if (input.restDays !== undefined) {
    const days = input.restDays;
    if (!Array.isArray(days) || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return failure('invalid');
    next.restDays = normalizeRestDays(days);
  }
  for (const key of ['routineWhen', 'routineWhere'] as const) {
    if (input[key] === undefined) continue;
    const text = routineText(input[key]);
    if (text === undefined) return failure('invalid');
    next[key] = text;
  }
  saveStudySettings(ctx, actor.id, next);
  return { ok: true, value: view(next), changed: ['settings', 'study'] };
}

/** Opening Hoje with nothing to study counts the day; with something left, it does nothing. */
export function touchStreak(ctx: Context, actor: Member): CommandResult<null> {
  if (dailyQueue(ctx, actor, null).length > 0) return { ok: true, value: null, changed: [] };
  const before = countedDays(ctx, actor.id).has(today(ctx));
  ctx.sql.run("INSERT OR IGNORE INTO streak_days (member_id, day, kind) VALUES (?, ?, 'open')", actor.id, today(ctx));
  return { ok: true, value: null, changed: before ? [] : ['study'] };
}

/** Fixes the missed day once a month: the day counts and the month is used. */
export function repairStreak(ctx: Context, actor: Member): CommandResult<null> {
  const settings = studySettings(ctx, actor.id);
  const day = today(ctx);
  const streak = computeStreak(countedDays(ctx, actor.id), settings.restDays, day);
  if (!streak.repairableDay || settings.streakRepairMonth === day.slice(0, 7)) return failure('conflict');
  ctx.sql.run("INSERT OR IGNORE INTO streak_days (member_id, day, kind) VALUES (?, ?, 'repair')", actor.id, streak.repairableDay);
  saveStudySettings(ctx, actor.id, { ...settings, streakRepairMonth: day.slice(0, 7) });
  return { ok: true, value: null, changed: ['study', 'settings'] };
}

