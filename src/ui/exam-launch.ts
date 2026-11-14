// How the Tópico screen's "Véspera deste tópico" opens the Prova tab with that topic ticked.
// A reload loses it and the tab opens with nothing ticked, which is always safe.
import { navigate } from './router';

let preselected: string | null = null;

export function openExamWithTopic(topicId: string): void {
  preselected = topicId;
  navigate('/prova');
}

/** The topic to tick when the tab opens, once. */
export function takePreselectedTopic(): string | null {
  const topicId = preselected;
  preselected = null;
  return topicId;
}
