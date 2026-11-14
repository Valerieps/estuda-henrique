// How a screen starts a study session: it asks here and the session layer (/estudo) reads the
// request. A reload of /estudo loses it and starts the day's review, which is always safe.
import type { StudyKind } from '../application/api-contract';
import { navigate } from './router';

export interface StudyRequest {
  readonly kind: StudyKind;
  /** Review only: cap the session (Só 5 cartas). */
  readonly limit?: number;
  /** Review only: Adiantar novas, 10 new cards of this topic past the daily limit. */
  readonly aheadTopicId?: string;
  /** Training only: the cards to study. */
  readonly cardIds?: readonly string[];
}

let pending: StudyRequest | null = null;

export function startStudy(request: StudyRequest = { kind: 'review' }): void {
  pending = request;
  navigate('/estudo');
}

/** The request to open the session with; the day's review when nobody asked for anything else. */
export function currentStudyRequest(): StudyRequest {
  return pending ?? { kind: 'review' };
}

export function clearStudyRequest(): void {
  pending = null;
}
