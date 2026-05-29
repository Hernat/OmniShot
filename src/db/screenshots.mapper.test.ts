import { describe, expect, it } from "@jest/globals";

import { EMBEDDING_DIM, embeddingToBlob } from "@/db/embedding-codec";
import {
  type ScreenshotRow,
  rowToScreenshot,
} from "@/db/screenshots.mapper";

function sampleEmbedding(): Float32Array {
  const f = new Float32Array(EMBEDDING_DIM);
  f[0] = 0.5;
  f[EMBEDDING_DIM - 1] = -0.25;
  return f;
}

function sampleRow(overrides: Partial<ScreenshotRow> = {}): ScreenshotRow {
  return {
    uri: "content://media/abc",
    embedding: embeddingToBlob(sampleEmbedding()),
    content_hash: "deadbeef",
    size_bytes: 12345,
    width: 1080,
    height: 2400,
    taken_at: 1700000000000,
    indexed_at: 1700000005000,
    ...overrides,
  };
}

describe("rowToScreenshot", () => {
  it("maps a fully-populated row to a typed Screenshot with decoded embedding", () => {
    const result = rowToScreenshot(sampleRow());
    expect(result.uri).toBe("content://media/abc");
    expect(result.contentHash).toBe("deadbeef");
    expect(result.sizeBytes).toBe(12345);
    expect(result.width).toBe(1080);
    expect(result.height).toBe(2400);
    expect(result.takenAt).toBe(1700000000000);
    expect(result.indexedAt).toBe(1700000005000);
    expect(result.embedding).toBeInstanceOf(Float32Array);
    expect(Array.from(result.embedding)).toEqual(Array.from(sampleEmbedding()));
  });

  it("maps a null taken_at to takenAt: null (not undefined, not 0)", () => {
    const result = rowToScreenshot(sampleRow({ taken_at: null }));
    expect(result.takenAt).toBeNull();
  });

  it("never leaks snake_case keys onto the typed object", () => {
    const result = rowToScreenshot(sampleRow());
    const keys = Object.keys(result);
    expect(keys).not.toContain("content_hash");
    expect(keys).not.toContain("size_bytes");
    expect(keys).not.toContain("taken_at");
    expect(keys).not.toContain("indexed_at");
  });
});
