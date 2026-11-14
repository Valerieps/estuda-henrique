// Colar várias (docs/spec/cartas.md): one card per line, `Pergunta ; Resposta ; Macete (opcional)`
// or a sentence with `{{gaps}}`. The preview counts what was recognized and flags the rest.
import type { NoteKind } from './cloze';
import { cardIndexes } from './cloze';

export interface PastedNote {
  readonly kind: NoteKind;
  readonly front: string;
  readonly back?: string;
  readonly hint?: string | null;
}

export interface PastedLine {
  /** Index of the line in the pasted text (blank lines are skipped but still count). */
  readonly index: number;
  readonly raw: string;
  /** Null when the line is not recognized. */
  readonly note: PastedNote | null;
  /** Cards the line creates: one per gap in a cloze, one for a basic card, 0 when not recognized. */
  readonly cards: number;
}

export function parseLine(raw: string): PastedNote | null {
  const line = raw.trim();
  if (cardIndexes('cloze', line).length > 0) return { kind: 'cloze', front: line };
  const parts = line.split(';').map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3) return null;
  const [front, back, hint] = parts;
  if (!front || !back) return null;
  return { kind: 'basic', front, back, hint: hint ? hint : null };
}

/** Every non-blank line of `text`, recognized or not. */
export function parsePasted(text: string): PastedLine[] {
  return text
    .split(/\r?\n/)
    .map((raw, index) => ({ raw, index }))
    .filter(({ raw }) => raw.trim().length > 0)
    .map(({ raw, index }) => {
      const note = parseLine(raw);
      return { index, raw, note, cards: note ? cardIndexes(note.kind, note.front).length : 0 };
    });
}

/** Replaces line `index` of `text`, keeping the others. */
export function replaceLine(text: string, index: number, value: string): string {
  const lines = text.split('\n');
  lines[index] = value;
  return lines.join('\n');
}
