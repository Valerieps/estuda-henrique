// The Sql port over the Durable Object's SQLite storage.
import type { Sql, SqlValue } from '../application/ports';

// The storage speaks ArrayBuffer for BLOBs; the port speaks Uint8Array, as node:sqlite does.
const toStorage = (value: SqlValue): string | number | null | ArrayBuffer =>
  value instanceof Uint8Array ? (value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer) : value;

const fromStorage = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof ArrayBuffer ? new Uint8Array(value) : value]));

export function durableObjectSql(storage: DurableObjectStorage): Sql {
  return {
    all: <T>(query: string, ...bindings: SqlValue[]) => storage.sql.exec(query, ...bindings.map(toStorage)).toArray().map(fromStorage) as T[],
    run: (query, ...bindings) => {
      storage.sql.exec(query, ...bindings.map(toStorage)).toArray();
    },
    // Durable Objects forbid BEGIN/COMMIT; transactionSync is the atomic block.
    transaction: (fn) => storage.transactionSync(fn),
  };
}
