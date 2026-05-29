import { EMBEDDING_DIM } from "@/db/embedding-codec";

/**
 * L2 (Euclidean) norm of a Float32Array.
 *
 * Implemented as an explicit loop rather than `Math.hypot(...v)`: spreading 512
 * elements into `Math.hypot` hits argument-count limits and is needlessly slow.
 */
export function l2Norm(v: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

/**
 * Throws a typed Error unless `v` is a finite `Float32Array` of length
 * `EMBEDDING_DIM` whose L2 norm is ≈ 1 (within `tol`, default 1e-3).
 *
 * The embedder (react-native-executorch) already L2-normalizes its output, so
 * this only *checks* the invariant — it never mutates or re-normalizes. A
 * failure here means the model/output contract changed and must be surfaced
 * loudly rather than silently corrected, since a bad vector poisons the index
 * and makes cosine ranking meaningless. Returns `v` for call-site chaining.
 */
export function assertValidEmbedding(v: Float32Array, tol = 1e-3): Float32Array {
  if (!(v instanceof Float32Array)) {
    throw new Error(
      `assertValidEmbedding: expected a Float32Array, got ${Object.prototype.toString.call(v)}`,
    );
  }
  if (v.length !== EMBEDDING_DIM) {
    throw new Error(
      `assertValidEmbedding: expected length ${EMBEDDING_DIM}, got ${v.length}`,
    );
  }
  for (let i = 0; i < v.length; i++) {
    if (!Number.isFinite(v[i])) {
      throw new Error(
        `assertValidEmbedding: non-finite value ${v[i]} at index ${i}`,
      );
    }
  }
  const norm = l2Norm(v);
  if (Math.abs(norm - 1) > tol) {
    throw new Error(
      `assertValidEmbedding: expected unit vector (|norm-1| <= ${tol}), got norm ${norm}`,
    );
  }
  return v;
}
