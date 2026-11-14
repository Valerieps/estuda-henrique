// The initial Biologia deck (docs/spec/cartas.md): the owner's own file, `server/seed/biologia-decks.json`,
// loaded as system cards by a migration, so the student finds cards on his first access. The card
// texts are copied as they are; this file only says which topic of the school's list each card
// goes to. A deck or subtheme with no topic in that list is left out, never invented.
import deck from '../seed/biologia-decks.json';

interface DeckCard {
  readonly id: string;
  readonly subtema: string;
  readonly frente: string;
  readonly verso: string;
}

interface DeckFile {
  readonly decks: readonly { readonly id: string; readonly cartas: readonly DeckCard[] }[];
}

/** The topics of Biologia, in the order of the school's list (docs/spec/cartas.md). */
export const INITIAL_TOPICS: readonly string[] = [
  'Classificação biológica',
  'Grupos zoológicos (comparativo)',
  'Platelmintos, Nematelmintos, Moluscos, Artrópodes e Cordados',
  'Grupos vegetais (comparativo)',
  'Angiospermas',
  'Fisiologia vegetal',
  'Monera',
  'Fungi',
  'Protoctista',
  'Bacterioses',
  'Viroses',
  'Protozooses',
  'Verminoses',
  'Histologia animal',
  'Histologia vegetal',
  'Sistemas genitais',
  'Gametogênese',
  'Regulação hormonal',
  'Métodos contraceptivos',
  "IST's",
];

const ZOOLOGICAL_EMPHASIS = 'Platelmintos, Nematelmintos, Moluscos, Artrópodes e Cordados';

/** Subthemes that go to a topic other than their deck's. */
const BY_SUBTHEME: Readonly<Record<string, string>> = {
  Bacterioses: 'Bacterioses',
  Protozooses: 'Protozooses',
  Angiospermas: 'Angiospermas',
  'Poríferos e cnidários': 'Grupos zoológicos (comparativo)',
  Anelídeos: 'Grupos zoológicos (comparativo)',
  Equinodermos: 'Grupos zoológicos (comparativo)',
  Platelmintos: ZOOLOGICAL_EMPHASIS,
  Nematelmintos: ZOOLOGICAL_EMPHASIS,
  Moluscos: ZOOLOGICAL_EMPHASIS,
  Artrópodes: ZOOLOGICAL_EMPHASIS,
  'Sistemas genitais': 'Sistemas genitais',
  Gametogênese: 'Gametogênese',
  'Regulação hormonal': 'Regulação hormonal',
  'Métodos contraceptivos': 'Métodos contraceptivos',
  ISTs: "IST's",
};

/** Decks whose cards all go to one topic. A deck not here and not in BY_SUBTHEME has no topic. */
const BY_DECK: Readonly<Record<string, string>> = {
  classificacao: 'Classificação biológica',
  virus: 'Viroses',
  monera: 'Monera',
  protoctista: 'Protoctista',
  fungi: 'Fungi',
  'botanica-grupos': 'Grupos vegetais (comparativo)',
  'histologia-vegetal': 'Histologia vegetal',
  'fisiologia-vegetal': 'Fisiologia vegetal',
  invertebrados: 'Grupos zoológicos (comparativo)',
  verminoses: 'Verminoses',
  cordados: ZOOLOGICAL_EMPHASIS,
  'histologia-animal': 'Histologia animal',
};

/** The topic a card goes to, or null when the school's list has none for it. */
export function topicFor(deckId: string, subtheme: string): string | null {
  // Reprodução humana is the only deck split by subtheme alone; the others fall back to the deck.
  return BY_SUBTHEME[subtheme] ?? BY_DECK[deckId] ?? null;
}

export interface LeftOut {
  readonly deck: string;
  readonly subtheme: string;
  readonly cards: number;
}

export function leftOut(file: DeckFile = deck as DeckFile): LeftOut[] {
  const counts = new Map<string, LeftOut>();
  for (const d of file.decks) {
    for (const card of d.cartas) {
      if (topicFor(d.id, card.subtema) !== null) continue;
      const key = `${d.id}/${card.subtema}`;
      counts.set(key, { deck: d.id, subtheme: card.subtema, cards: (counts.get(key)?.cards ?? 0) + 1 });
    }
  }
  return [...counts.values()];
}

const quote = (text: string): string => `'${text.replace(/'/g, "''")}'`;
const AT = quote('2026-11-13T00:00:00.000Z');
const topicId = (index: number): string => `seed-topic-${index + 1}`;

/** The statements of the migration: the topics, then one system note and one card per deck card. */
export function initialDeckStatements(file: DeckFile = deck as DeckFile): string[] {
  const statements = INITIAL_TOPICS.map(
    (name, index) =>
      `INSERT INTO topics (id, subject_id, name, position, created_at) VALUES (${quote(topicId(index))}, 'biologia', ${quote(name)}, ${index}, ${AT})`,
  );
  for (const d of file.decks) {
    for (const card of d.cartas) {
      const topic = topicFor(d.id, card.subtema);
      if (topic === null) continue;
      const note = quote(`seed-${card.id}`);
      statements.push(
        `INSERT INTO notes (id, topic_id, owner_id, kind, front, back, hint, created_at, updated_at) VALUES (${note}, ${quote(topicId(INITIAL_TOPICS.indexOf(topic)))}, NULL, 'basic', ${quote(card.frente)}, ${quote(card.verso)}, NULL, ${AT}, ${AT})`,
        `INSERT INTO cards (id, note_id, cloze_index) VALUES (${quote(`seed-${card.id}-0`)}, ${note}, 0)`,
      );
    }
  }
  return statements;
}
