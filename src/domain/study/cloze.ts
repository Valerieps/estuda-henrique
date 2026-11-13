// Cloze notes (docs/spec/cartas.md, "Tipos de carta"): a sentence with `{{marked}}` passages.
// Each passage becomes one card; card N hides passage N and shows the others as plain text.

export type NoteKind = 'basic' | 'cloze';

/** The `cloze_index` of a basic note's single card. Cloze cards count from 1. */
export const BASIC_CARD_INDEX = 0;

const PASSAGE = /\{\{(.+?)\}\}/g;

/** The marked passages, in order. Empty or blank markers do not count. */
export function clozePassages(text: string): string[] {
  return [...text.matchAll(PASSAGE)].map((m) => m[1].trim()).filter((p) => p.length > 0);
}

/** The `cloze_index` of every card a note creates. */
export function cardIndexes(kind: NoteKind, front: string): number[] {
  if (kind === 'basic') return [BASIC_CARD_INDEX];
  return clozePassages(front).map((_, i) => i + 1);
}

/** A cloze card as plain text pieces: the UI draws `hidden` as a blank on the front. */
export interface ClozeCard {
  readonly before: string;
  readonly hidden: string;
  readonly after: string;
}

/** Card `index` (from 1) of a cloze sentence, or null when there is no such passage. */
export function clozeCard(text: string, index: number): ClozeCard | null {
  const match = [...text.matchAll(PASSAGE)].filter((m) => m[1].trim().length > 0)[index - 1];
  if (!match) return null;
  const start = match.index ?? 0;
  return {
    before: unmark(text.slice(0, start)),
    hidden: match[1].trim(),
    after: unmark(text.slice(start + match[0].length)),
  };
}

/** The text with every marker replaced by its passage. */
export function unmark(text: string): string {
  return text.replace(PASSAGE, (_m, passage: string) => passage.trim());
}
