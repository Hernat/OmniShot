// Singleton expo-sqlite handle. The DB is opened lazily on first getDb() call,
// migrations run once, and the handle is reused for the app's lifetime. Lazy
// opening keeps importing this module side-effect-free so the pure db modules
// (codec, mapper) stay testable in Node.

import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

import { migrate } from "@/db/migrations";

export const DB_NAME = "omnishot.db";

let db: SQLiteDatabase | null = null;

/** Lazily opens the DB (default SQLite directory), runs migrations once. */
export function getDb(): SQLiteDatabase {
  if (db) return db;
  const handle = openDatabaseSync(DB_NAME);
  try {
    handle.execSync("PRAGMA journal_mode = WAL;");
    migrate(handle);
  } catch (error) {
    // Don't leak the native handle if WAL/migration fails — close it before
    // rethrowing so a retry doesn't open a second connection to the same file.
    handle.closeSync();
    throw error;
  }
  db = handle;
  return db;
}

/**
 * Fire-and-forget boot warmer so the schema exists on first launch. Swallows
 * its own errors — a DB failure must never block the splash from hiding or a
 * route from rendering (the DB is not yet load-bearing for any Epic 2 route).
 */
export function initDb(): void {
  try {
    getDb();
  } catch (error) {
    console.warn("[db] initDb failed:", error);
  }
}

/** Test-only: drop the cached handle so a fresh getDb() reopens the DB. */
export function __resetDbForTests(): void {
  db = null;
}
