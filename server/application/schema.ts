// The group's database (docs/ARQUITETURA.md). Migrations run in order, once each, when the
// Durable Object starts. Never edit a migration that has shipped: add the next one.
import { addedDeckStatements, initialDeckStatements } from './initial-deck';
import { revisionOneStatements, revisionTwoStatements } from './seed-revision';
import type { Sql } from './ports';

export const MIGRATIONS: readonly (readonly string[])[] = [
  // 1: members, their sessions and the invites.
  [
    `CREATE TABLE members (
      id TEXT PRIMARY KEY,
      google_sub TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      photo_url TEXT,
      roles TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      joined_at TEXT NOT NULL,
      removed_at TEXT
    )`,
    `CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`,
    `CREATE INDEX sessions_member ON sessions(member_id)`,
    `CREATE TABLE invites (
      email TEXT PRIMARY KEY,
      invited_by TEXT NOT NULL REFERENCES members(id),
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      accepted_at TEXT,
      revoked_at TEXT
    )`,
  ],
  // 2: the study (phase 1). Subjects, topics, notes and cards are shared content; every table with
  // a member_id is private to that member (ADR-009). The group starts with one subject, Biologia.
  [
    `CREATE TABLE subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    )`,
    `INSERT INTO subjects (id, name, position) VALUES ('biologia', 'Biologia', 0)`,
    `CREATE TABLE topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id),
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX topics_subject ON topics(subject_id, position)`,
    `CREATE TABLE notes (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL REFERENCES topics(id),
      owner_id TEXT REFERENCES members(id),
      kind TEXT NOT NULL CHECK (kind IN ('basic', 'cloze')),
      front TEXT NOT NULL,
      back TEXT NOT NULL DEFAULT '',
      hint TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX notes_topic ON notes(topic_id)`,
    `CREATE INDEX notes_owner ON notes(owner_id)`,
    `CREATE TABLE cards (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id),
      cloze_index INTEGER NOT NULL,
      UNIQUE (note_id, cloze_index)
    )`,
    `CREATE TABLE card_states (
      member_id TEXT NOT NULL REFERENCES members(id),
      card_id TEXT NOT NULL REFERENCES cards(id),
      stage TEXT NOT NULL CHECK (stage IN ('new', 'learning', 'review', 'relearning')),
      due TEXT NOT NULL,
      stability REAL NOT NULL,
      difficulty REAL NOT NULL,
      scheduled_days INTEGER NOT NULL,
      learning_steps INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      lapses INTEGER NOT NULL,
      last_review TEXT,
      suspended INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (member_id, card_id)
    )`,
    `CREATE INDEX card_states_due ON card_states(member_id, due)`,
    `CREATE TABLE study_sessions (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      kind TEXT NOT NULL CHECK (kind IN ('review', 'cram', 'retry', 'selected')),
      is_training INTEGER NOT NULL,
      study_day TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT
    )`,
    `CREATE INDEX study_sessions_member ON study_sessions(member_id, study_day)`,
    `CREATE TABLE reviews (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      card_id TEXT NOT NULL REFERENCES cards(id),
      session_id TEXT NOT NULL REFERENCES study_sessions(id),
      rating TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good')),
      reviewed_at TEXT NOT NULL,
      study_day TEXT NOT NULL,
      is_training INTEGER NOT NULL,
      previous_state TEXT
    )`,
    `CREATE INDEX reviews_member_card ON reviews(member_id, card_id, reviewed_at)`,
    `CREATE INDEX reviews_session ON reviews(session_id, reviewed_at)`,
    `CREATE TABLE topic_snapshots (
      member_id TEXT NOT NULL REFERENCES members(id),
      topic_id TEXT NOT NULL REFERENCES topics(id),
      week TEXT NOT NULL,
      mastery REAL NOT NULL,
      PRIMARY KEY (member_id, topic_id, week)
    )`,
    `CREATE TABLE study_settings (
      member_id TEXT PRIMARY KEY REFERENCES members(id),
      new_per_day INTEGER NOT NULL,
      rest_days TEXT NOT NULL DEFAULT '[]',
      routine_when TEXT,
      routine_where TEXT,
      streak_repair_month TEXT
    )`,
  ],
  // 3: deleting a note or dropping a cloze passage never touches the study history, so notes and
  // cards are only hidden: `deleted_at` on the note, `retired` on a card whose passage is gone.
  [`ALTER TABLE notes ADD COLUMN deleted_at TEXT`, `ALTER TABLE cards ADD COLUMN retired INTEGER NOT NULL DEFAULT 0`],
  // 4: the diagnosis keeps one snapshot a day (docs/spec/diagnostico.md), not one a week. Nothing
  // wrote the weekly table yet, so it is replaced; `daily_snapshots` holds the member's long-term
  // memory (null before 20 answers) and saved cards.
  [
    `DROP TABLE topic_snapshots`,
    `CREATE TABLE topic_snapshots (
      member_id TEXT NOT NULL REFERENCES members(id),
      topic_id TEXT NOT NULL REFERENCES topics(id),
      day TEXT NOT NULL,
      mastery REAL NOT NULL,
      PRIMARY KEY (member_id, topic_id, day)
    )`,
    `CREATE TABLE daily_snapshots (
      member_id TEXT NOT NULL REFERENCES members(id),
      day TEXT NOT NULL,
      long_term_rate REAL,
      long_term_answers INTEGER NOT NULL,
      saved_cards INTEGER NOT NULL,
      PRIMARY KEY (member_id, day)
    )`,
  ],
  // 5: days that count for the streak without a finished session: the day he opened Hoje with
  // nothing to study ('open') and a missed day he fixed ('repair') (docs/spec/meta-e-ofensiva.md).
  [
    `CREATE TABLE streak_days (
      member_id TEXT NOT NULL REFERENCES members(id),
      day TEXT NOT NULL,
      kind TEXT NOT NULL,
      PRIMARY KEY (member_id, day)
    )`,
  ],
  // 6: the initial Biologia deck, as system cards (docs/spec/cartas.md), so he finds cards on his first access.
  initialDeckStatements(),
  // 7: the topics and cards of the file's decks the school's list has no topic for (Embriologia, Fisiologia humana, Ecologia).
  addedDeckStatements(),
  // 8: roles are admin and user, and a member may hold both (docs/spec/acesso-e-membros.md). Who
  // had no role was the student: now a user. A user's edit of a system note is theirs alone: it
  // lives in `note_edits`, the note itself stays as the admin wrote it (docs/spec/cartas.md).
  [
    `UPDATE members SET roles = '["user"]' WHERE roles = '[]'`,
    `CREATE TABLE note_edits (
      member_id TEXT NOT NULL REFERENCES members(id),
      note_id TEXT NOT NULL REFERENCES notes(id),
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      hint TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (member_id, note_id)
    )`,
  ],
  // 9: a user deleting a system card hides it for themselves only (docs/spec/cartas.md); the note
  // and everyone else's deck stay as they were, and so does the member's study history.
  [
    `CREATE TABLE note_hidden (
      member_id TEXT NOT NULL REFERENCES members(id),
      note_id TEXT NOT NULL REFERENCES notes(id),
      hidden_at TEXT NOT NULL,
      PRIMARY KEY (member_id, note_id)
    )`,
  ],
  // 10: the initial deck's cards rewritten by docs/spec/boas-cartas.md: new system notes in the same
  // topics, and each replaced card suspended for every member; `superseded_cards` keeps the list so
  // a member who joins later starts with them suspended too.
  revisionOneStatements(),
  // 11: revision 2 (server/seed/biologia-revisao-2.json): system notes deleted or rewritten in place,
  // for every member, by the PAS 2 matrix (docs/PAS.md) and docs/spec/boas-cartas.md.
  revisionTwoStatements(),
  // 12: the Rotina screen after his first Resumo is asked once (docs/spec/meta-e-ofensiva.md); a
  // member who already filled the routine in Ajustes was asked, in effect.
  [
    `ALTER TABLE study_settings ADD COLUMN routine_asked INTEGER NOT NULL DEFAULT 0`,
    `UPDATE study_settings SET routine_asked = 1 WHERE routine_when IS NOT NULL OR routine_where IS NOT NULL`,
  ],
  // 13: card images (ADR-012); owner_id null = a system image, every active member may read it.
  [
    `CREATE TABLE images (
      id TEXT PRIMARY KEY,
      owner_id TEXT REFERENCES members(id),
      mime TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      bytes INTEGER NOT NULL,
      data BLOB NOT NULL,
      created_at TEXT NOT NULL
    )`,
  ],
];

export function migrate(sql: Sql): void {
  sql.run('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const [{ current }] = sql.all<{ current: number | null }>('SELECT MAX(version) AS current FROM schema_migrations');
  for (let version = (current ?? 0) + 1; version <= MIGRATIONS.length; version++) {
    sql.transaction(() => {
      for (const statement of MIGRATIONS[version - 1]) sql.run(statement);
      sql.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', version, new Date().toISOString());
    });
  }
}
