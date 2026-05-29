// Typed repository over the screenshots table — the single boundary the indexer
// (Epic 2) and search (Epic 3) modules use to touch SQLite. Every read method
// returns a typed Screenshot / primitive / matrix, never a raw SQLite row.
// Calls native expo-sqlite via the lazy getDb() singleton, so this module is
// verified on-device (AVD walkthrough), not under jest-expo.

import { getDb } from "@/db/client";
import { EMBEDDING_DIM, blobToEmbedding, embeddingToBlob } from "@/db/embedding-codec";
import {
  type EmbeddingMatrix,
  type Screenshot,
  type ScreenshotRow,
  rowToScreenshot,
} from "@/db/screenshots.mapper";

export type { Screenshot, EmbeddingMatrix } from "@/db/screenshots.mapper";

const UPSERT_SQL = `
  INSERT INTO screenshots
    (uri, embedding, content_hash, size_bytes, width, height, taken_at, indexed_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(uri) DO UPDATE SET
    embedding    = excluded.embedding,
    content_hash = excluded.content_hash,
    size_bytes   = excluded.size_bytes,
    width        = excluded.width,
    height       = excluded.height,
    taken_at     = excluded.taken_at,
    indexed_at   = excluded.indexed_at;`;

/** Insert or replace a screenshot row, keyed by uri. */
export function upsert(s: Screenshot): void {
  getDb().runSync(UPSERT_SQL, [
    s.uri,
    embeddingToBlob(s.embedding),
    s.contentHash,
    s.sizeBytes,
    s.width,
    s.height,
    s.takenAt,
    s.indexedAt,
  ]);
}

/** Fetch one screenshot by uri, or null if absent. Embedding is decoded. */
export function getByUri(uri: string): Screenshot | null {
  const row = getDb().getFirstSync<ScreenshotRow>(
    `SELECT * FROM screenshots WHERE uri = ?;`,
    [uri],
  );
  return row ? rowToScreenshot(row) : null;
}

/** Remove the screenshot row with the given uri (a DB row — never a file). */
export function deleteByUri(uri: string): void {
  getDb().runSync(`DELETE FROM screenshots WHERE uri = ?;`, [uri]);
}

/**
 * Warm-load all embeddings into a single flat Float32Array (N×512) plus a
 * parallel uris[]. uris[i] pairs with embeddings[i*512..(i+1)*512). Returns an
 * empty matrix (no throw) when the table is empty.
 */
export function getAllEmbeddingsAsFloat32Array(): EmbeddingMatrix {
  const rows = getDb().getAllSync<{ uri: string; embedding: Uint8Array }>(
    `SELECT uri, embedding FROM screenshots;`,
  );
  const count = rows.length;
  const uris: string[] = new Array<string>(count);
  const embeddings = new Float32Array(count * EMBEDDING_DIM);
  for (let i = 0; i < count; i++) {
    uris[i] = rows[i].uri;
    embeddings.set(blobToEmbedding(rows[i].embedding), i * EMBEDDING_DIM);
  }
  return { uris, embeddings, count, dim: EMBEDDING_DIM };
}

/** Number of indexed screenshots. */
export function count(): number {
  return (
    getDb().getFirstSync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM screenshots;`,
    )?.n ?? 0
  );
}
