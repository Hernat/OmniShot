// Pure codec between a MobileCLIP embedding (Float32Array) and its SQLite BLOB
// byte representation. No React, no Expo, no expo-sqlite imports — unit-testable
// in Node. expo-sqlite binds/returns BLOBs as Uint8Array (NOT Node Buffer, which
// does not exist in the React Native runtime).

export const EMBEDDING_DIM = 512;

const BLOB_BYTE_LENGTH = EMBEDDING_DIM * 4; // 512 float32 = 2048 bytes

/** Serialize a 512-dim Float32Array to the BLOB byte representation. */
export function embeddingToBlob(embedding: Float32Array): Uint8Array {
  if (embedding.length !== EMBEDDING_DIM) {
    throw new Error(
      `embeddingToBlob: expected ${EMBEDDING_DIM}-dim vector, got ${embedding.length}`,
    );
  }
  // Share the backing buffer scoped to this array's own region — correct even
  // if `embedding` is itself a subarray view of a larger buffer. expo-sqlite
  // reads the bytes at bind time, so sharing here is safe.
  return new Uint8Array(
    embedding.buffer,
    embedding.byteOffset,
    embedding.byteLength,
  );
}

/** Decode a BLOB (as returned by expo-sqlite) back to a 512-dim Float32Array. */
export function blobToEmbedding(blob: Uint8Array): Float32Array {
  if (blob.byteLength !== BLOB_BYTE_LENGTH) {
    throw new Error(
      `blobToEmbedding: expected ${BLOB_BYTE_LENGTH} bytes, got ${blob.byteLength}`,
    );
  }
  // Copy into a fresh, offset-0 ArrayBuffer before constructing the
  // Float32Array. The Uint8Array expo-sqlite returns can be a window into a
  // larger pooled buffer with an arbitrary byteOffset; Float32Array requires a
  // 4-byte-aligned offset and would otherwise throw a RangeError. slice() always
  // allocates a new buffer starting at offset 0, so this is alignment-safe.
  const copy = blob.slice();
  // No endianness handling: write and read happen on the same device, so the
  // platform byte order cancels out. Do not add DataView byte-swapping.
  return new Float32Array(copy.buffer);
}
