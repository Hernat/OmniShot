import { describe, expect, it } from "@jest/globals";

import { EMBEDDING_DIM } from "@/db/embedding-codec";
import { assertValidEmbedding, l2Norm } from "@/model/embedding-validate";

/** Build a Float32Array(EMBEDDING_DIM) from a generator, L2-normalized. */
function unitVector(fill: (i: number) => number): Float32Array {
  const v = new Float32Array(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) v[i] = fill(i);
  const norm = l2Norm(v);
  for (let i = 0; i < EMBEDDING_DIM; i++) v[i] = v[i] / norm;
  return v;
}

describe("embedding-validate", () => {
  describe("l2Norm", () => {
    it("computes the Euclidean length of a known vector", () => {
      const v = new Float32Array(EMBEDDING_DIM);
      v[0] = 3;
      v[1] = 4; // 3-4-5 triangle, rest zero
      expect(l2Norm(v)).toBeCloseTo(5, 5);
    });

    it("is 0 for the zero vector", () => {
      expect(l2Norm(new Float32Array(EMBEDDING_DIM))).toBe(0);
    });
  });

  describe("assertValidEmbedding", () => {
    it("returns a genuine unit-length vector unchanged", () => {
      const v = unitVector((i) => Math.sin(i) + 0.5);
      const out = assertValidEmbedding(v);
      expect(out).toBe(v);
      expect(Math.abs(l2Norm(out) - 1)).toBeLessThan(1e-3);
    });

    it("throws on wrong length (too short)", () => {
      expect(() => assertValidEmbedding(new Float32Array(EMBEDDING_DIM - 1))).toThrow();
    });

    it("throws on wrong length (too long)", () => {
      expect(() => assertValidEmbedding(new Float32Array(EMBEDDING_DIM + 1))).toThrow();
    });

    it("throws on a non-Float32Array input (plain number[])", () => {
      // The model output contract drifting to a plain array (e.g. number[]) must
      // be rejected by the `instanceof Float32Array` guard, not silently accepted.
      const notTyped = new Array(EMBEDDING_DIM).fill(0) as unknown as Float32Array;
      expect(() => assertValidEmbedding(notTyped)).toThrow();
    });

    it("throws on the all-zero vector (degenerate model output → norm 0)", () => {
      // A blank/corrupt image can make the model emit an all-zero vector: length
      // and finiteness pass, but L2 norm is 0, so the unit-norm guard must throw.
      expect(() => assertValidEmbedding(new Float32Array(EMBEDDING_DIM))).toThrow();
    });

    it("throws on a non-finite element (NaN)", () => {
      const v = unitVector((i) => Math.cos(i) + 0.5);
      v[10] = NaN;
      expect(() => assertValidEmbedding(v)).toThrow();
    });

    it("throws on a non-finite element (Infinity)", () => {
      const v = unitVector((i) => Math.cos(i) + 0.5);
      v[10] = Infinity;
      expect(() => assertValidEmbedding(v)).toThrow();
    });

    it("throws on a non-unit vector (norm 2.0) at default tolerance", () => {
      const v = unitVector((i) => Math.sin(i) + 0.5);
      for (let i = 0; i < EMBEDDING_DIM; i++) v[i] = v[i] * 2; // norm → 2
      expect(() => assertValidEmbedding(v)).toThrow();
    });

    it("accepts that same non-unit vector when tol is widened past 1.0", () => {
      const v = unitVector((i) => Math.sin(i) + 0.5);
      for (let i = 0; i < EMBEDDING_DIM; i++) v[i] = v[i] * 2; // norm → 2
      expect(() => assertValidEmbedding(v, 1.5)).not.toThrow();
    });

    it("accepts a near-unit vector at the default tolerance boundary", () => {
      const v = unitVector((i) => Math.sin(i) + 0.5);
      const scale = 1 + 9e-4; // just inside tol 1e-3
      for (let i = 0; i < EMBEDDING_DIM; i++) v[i] = v[i] * scale;
      expect(() => assertValidEmbedding(v)).not.toThrow();
    });
  });
});
