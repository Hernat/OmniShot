// Pure types + row mapper for the screenshots table. Imports ONLY the codec —
// never expo-sqlite or client.ts — so it (and its tests) stay free of the native
// module and run in plain Node. The repo (screenshots.repo.ts) imports this file;
// this file never imports the repo.

import { blobToEmbedding } from "@/db/embedding-codec";

/** Typed domain object returned by the repo. Embedding is already decoded. */
export interface Screenshot {
  uri: string;
  embedding: Float32Array; // length 512, L2-normalized by the embedder (Story 2.2)
  contentHash: string;
  sizeBytes: number;
  width: number;
  height: number;
  takenAt: number | null; // epoch ms, NULL if EXIF missing
  indexedAt: number; // epoch ms
}

/** Raw row shape as returned by expo-sqlite (BLOB column is a Uint8Array). */
export interface ScreenshotRow {
  uri: string;
  embedding: Uint8Array;
  content_hash: string;
  size_bytes: number;
  width: number;
  height: number;
  taken_at: number | null;
  indexed_at: number;
}

/**
 * Warm-load shape for the cosine ranker (Story 3.2): a single flat Float32Array
 * of N×512 plus a parallel uris[] where uris[i] pairs with embeddings[i*512..].
 */
export interface EmbeddingMatrix {
  uris: string[];
  embeddings: Float32Array;
  count: number;
  dim: number;
}

/** Map a raw SQLite row to a typed Screenshot. Guarantees no raw row escapes. */
export function rowToScreenshot(row: ScreenshotRow): Screenshot {
  return {
    uri: row.uri,
    embedding: blobToEmbedding(row.embedding),
    contentHash: row.content_hash,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    takenAt: row.taken_at,
    indexedAt: row.indexed_at,
  };
}
