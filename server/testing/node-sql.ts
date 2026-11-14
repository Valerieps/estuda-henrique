// The Sql port over node:sqlite, for tests. Same SQLite engine the Durable Object uses.
import { DatabaseSync } from 'node:sqlite';
import type { Clock, IdGenerator, Sql, SqlValue } from '../application/ports';

export function memorySql(): Sql {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  let depth = 0;
  return {
    all: <T>(query: string, ...bindings: SqlValue[]) => db.prepare(query).all(...bindings) as T[],
    run: (query, ...bindings) => {
      db.prepare(query).run(...bindings);
    },
    transaction: (fn) => {
      if (depth > 0) return fn();
      depth++;
      db.exec('BEGIN');
      try {
        const result = fn();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      } finally {
        depth--;
      }
    },
  };
}

export function fixedClock(iso: string): Clock & { set(iso: string): void } {
  let now = new Date(iso);
  return { now: () => now, set: (next) => (now = new Date(next)) };
}

export function sequentialIds(): IdGenerator {
  let n = 0;
  return { next: () => `id-${++n}` };
}

/**
 * Like `memorySql`, but the migration that loads the initial deck inserts nothing, so a test starts
 * with the empty subject it builds its own topics and cards on.
 */
export function emptyDeckSql(): Sql {
  const sql = memorySql();
  return { ...sql, run: (query, ...bindings) => (/^INSERT INTO (topics|notes|cards) .*VALUES \('seed-/.test(query) ? undefined : sql.run(query, ...bindings)) };
}
