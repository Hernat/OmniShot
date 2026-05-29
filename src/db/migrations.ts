// Schema DDL + versioned migration runner for the screenshots table.
// DDL is inlined as TS strings (not a schema.sql file) so Metro bundles it
// without a custom transformer. expo-sqlite is imported type-only here, so this
// module pulls no native code at import time.

import type { SQLiteDatabase } from "expo-sqlite";

const CREATE_SCREENSHOTS = `
  CREATE TABLE IF NOT EXISTS screenshots (
    uri          TEXT PRIMARY KEY,
    embedding    BLOB NOT NULL,
    content_hash TEXT NOT NULL,
    size_bytes   INTEGER NOT NULL,
    width        INTEGER NOT NULL,
    height       INTEGER NOT NULL,
    taken_at     INTEGER,
    indexed_at   INTEGER NOT NULL
  );`;

const CREATE_IDX = `CREATE INDEX IF NOT EXISTS idx_indexed_at ON screenshots(indexed_at);`;

/** Ordered migrations. MIGRATIONS[0] brings a fresh DB to schema version 1. */
const MIGRATIONS: ((db: SQLiteDatabase) => void)[] = [
  (db) => {
    db.execSync(CREATE_SCREENSHOTS);
    db.execSync(CREATE_IDX);
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.length; // = 1

/**
 * Idempotent migration runner. Tracks the applied version in a `schema_version`
 * table (per the story AC, rather than PRAGMA user_version). Safe to call on
 * every app launch — does nothing once the DB is at the latest version.
 */
export function migrate(db: SQLiteDatabase): void {
  db.execSync(
    `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);`,
  );
  const row = db.getFirstSync<{ version: number }>(
    `SELECT version FROM schema_version LIMIT 1;`,
  );
  const current = row?.version ?? 0;
  if (current >= LATEST_SCHEMA_VERSION) return;
  db.withTransactionSync(() => {
    for (let v = current; v < LATEST_SCHEMA_VERSION; v++) {
      MIGRATIONS[v](db);
    }
    db.execSync(`DELETE FROM schema_version;`);
    db.runSync(`INSERT INTO schema_version (version) VALUES (?);`, [
      LATEST_SCHEMA_VERSION,
    ]);
  });
}
