/** Inputs of the Hoje warning card. The optional ones are filled by the phase 2 sessions. */
export interface WarningState {
  /** A streak he can still fix. */
  readonly canRepairStreak: boolean;
  /** He studied at least once (the install warning waits for this). */
  readonly hasStudied: boolean;
  /** The browser offers installing the app. */
  readonly canInstall: boolean;
  /** An exam date passed and its result was not recorded yet. */
  readonly examResultPending?: boolean;
  /** A new week or term started, so he can restart. */
  readonly canRestart?: boolean;
  /** This week's summary is ready to show. */
  readonly weeklySummaryReady?: boolean;
}

export type Warning =
  | { readonly kind: 'streak-repair' }
  | { readonly kind: 'install' }
  | { readonly kind: 'exam-result' }
  | { readonly kind: 'restart' }
  | { readonly kind: 'weekly-summary' };

/** The one warning to show, by the spec's order (meta-e-ofensiva.md, "Cartão de aviso"). */
export function pickWarning(state: WarningState): Warning | null {
  if (state.canRepairStreak) return { kind: 'streak-repair' };
  if (state.hasStudied && state.canInstall) return { kind: 'install' };
  if (state.examResultPending) return { kind: 'exam-result' };
  if (state.canRestart) return { kind: 'restart' };
  if (state.weeklySummaryReady) return { kind: 'weekly-summary' };
  return null;
}
