import { assertValidEmbedding } from "@/model/embedding-validate";
import { getImageEmbedder } from "@/model/loader";

/**
 * Embed a single image into a normalized `Float32Array(512)`.
 *
 * `uri` is a local image URI (`file://`). react-native-executorch performs all
 * preprocessing internally (decode, resize to 224×224, CLIP mean/std normalize)
 * and returns an already L2-normalized vector — so this function does NOT
 * preprocess and does NOT re-normalize. It only validates the invariant
 * (length 512, finite, ≈unit) and throws if the model output contract drifts.
 *
 * NOTE (forward dependency, Story 2.3): whether `forward` accepts an Android SAF
 * `content://` URI directly is unverified. The indexer must bridge SAF URIs to
 * `file://` (or `PixelData`) if `forward` rejects them.
 */
export async function embedImage(uri: string): Promise<Float32Array> {
  const model = await getImageEmbedder();
  const embedding = await model.forward(uri);
  return assertValidEmbedding(embedding);
}
