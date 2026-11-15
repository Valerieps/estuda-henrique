import { describe, expect, it } from 'vitest';
import { pickWarning, type WarningState } from './warning-card';

const none: WarningState = { canRepairStreak: false, hasStudied: true, canInstall: false };

describe('pickWarning', () => {
  it('shows nothing when nothing applies', () => {
    expect(pickWarning(none)).toBeNull();
  });

  it('puts the streak repair before everything', () => {
    const all = { ...none, canRepairStreak: true, canInstall: true, examResultPending: true, canRestart: true, weeklySummaryReady: true };
    expect(pickWarning(all)).toEqual({ kind: 'streak-repair' });
  });

  it('offers install only after the first session', () => {
    expect(pickWarning({ ...none, canInstall: true })).toEqual({ kind: 'install' });
    expect(pickWarning({ ...none, canInstall: true, hasStudied: false })).toBeNull();
  });

  it('orders install, exam result, restart, weekly summary', () => {
    const all = { ...none, canInstall: true, examResultPending: true, canRestart: true, weeklySummaryReady: true };
    expect(pickWarning(all)).toEqual({ kind: 'install' });
    expect(pickWarning({ ...all, canInstall: false })).toEqual({ kind: 'exam-result' });
    expect(pickWarning({ ...all, canInstall: false, examResultPending: false })).toEqual({ kind: 'restart' });
    expect(pickWarning({ ...none, weeklySummaryReady: true })).toEqual({ kind: 'weekly-summary' });
  });
});
