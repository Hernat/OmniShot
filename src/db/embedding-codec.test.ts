import { describe, expect, it } from "@jest/globals";

import {
  EMBEDDING_DIM,
  blobToEmbedding,
  embeddingToBlob,
} from "@/db/embedding-codec";

function sampleEmbedding(): Float32Array {
  const f = new Float32Array(EMBEDDING_DIM);
  // Varied values that exercise the full float32 range, incl. edge cases.
  f[0] = 0;
  f[1] = 1;
  f[2] = -1;
  f[3] = 0.123456;
  f[4] = Math.PI;
  f[5] = 1e20;
  f[6] = 1e-20;
  f[7] = Math.fround(Number.MIN_VALUE); // denormal after float32 rounding
  for (let i = 8; i < EMBEDDING_DIM; i++) {
    f[i] = Math.fround(Math.sin(i)); // deterministic spread of fractional values
  }
  return f;
}

describe("embedding-codec", () => {
  it("roundtrips a 512-dim Float32Array losslessly", () => {
    const original = sampleEmbedding();
    const decoded = blobToEmbedding(embeddingToBlob(original));
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it("produces a blob of exactly 2048 bytes for a 512-dim input", () => {
    const blob = embeddingToBlob(sampleEmbedding());
    expect(blob.byteLength).toBe(EMBEDDING_DIM * 4);
    expect(blob.byteLength).toBe(2048);
  });

  it("decodes correctly when the blob is a misaligned view into a larger buffer", () => {
    const original = sampleEmbedding();
    const bytes = embeddingToBlob(original);
    // Place the real bytes at a deliberately non-4-aligned offset (3).
    const backing = new Uint8Array(2048 + 3);
    backing.set(bytes, 3);
    const view = backing.subarray(3, 3 + 2048); // byteOffset === 3, not 4-aligned
    expect(view.byteOffset).toBe(3);
    expect(Array.from(blobToEmbedding(view))).toEqual(Array.from(original));
  });

  it("throws when encoding a vector of the wrong dimension", () => {
    expect(() => embeddingToBlob(new Float32Array(256))).toThrow();
  });

  it("throws when decoding a blob of the wrong byte length", () => {
    expect(() => blobToEmbedding(new Uint8Array(100))).toThrow();
  });
});
