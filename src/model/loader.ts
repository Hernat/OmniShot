import type { ImageEmbeddingsModule } from "react-native-executorch";

// Bundled CLIP ViT-B/32 image encoder (int8, XNNPACK) — the exact file the
// built-in `clip-vit-base-patch32-image-quantized` model resolves to on HF.
// `require`/default-import of a `.pte` yields a Metro asset id (number), a valid
// ResourceSource. Bundling it (vs the remote constant) keeps the app fully
// offline (NFR-Offline / NFR-Privacy) in release builds.
import clipImageModel from "../../assets/model/clip_vit_base_patch32_image_xnnpack_int8.pte";

// react-native-executorch ships native code and is NOT available in Expo Go.
// Importing it at module-load throws (native JSI proxy) in Expo Go / any build
// where the package isn't linked — which would redbox the whole app at BOOT,
// since `_layout` imports this module. We therefore import it LAZILY (runtime
// `require`, with a type-only static import for typings) so merely loading this
// module never evaluates the native binding. The throw then surfaces as a
// promise rejection that `initModel` swallows, so boot is never blocked. This
// app requires a dev/standalone build — do NOT run it in Expo Go.

let initialized = false;
let modulePromise: Promise<ImageEmbeddingsModule> | null = null;

/**
 * Lazily loads (once) and returns the shared image-embedding module.
 *
 * Uses `fromModelName` with the blessed built-in `clip-vit-base-patch32-image-quantized`
 * identity but a LOCAL bundled `modelSource`, so the supported CLIP tensor
 * contract applies while the model stays offline. (`fromCustomModel` is avoided:
 * its native tensor contract is documented as "not formally defined".)
 */
export function getImageEmbedder(): Promise<ImageEmbeddingsModule> {
  if (modulePromise) return modulePromise;
  modulePromise = (async () => {
    const rne =
      require("react-native-executorch") as typeof import("react-native-executorch");
    if (!initialized) {
      const { ExpoResourceFetcher } =
        require("react-native-executorch-expo-resource-fetcher") as typeof import("react-native-executorch-expo-resource-fetcher");
      rne.initExecutorch({ resourceFetcher: ExpoResourceFetcher });
      initialized = true;
    }
    return rne.ImageEmbeddingsModule.fromModelName({
      modelName: "clip-vit-base-patch32-image-quantized",
      modelSource: clipImageModel,
    });
  })().catch((error: unknown) => {
    // Don't cache a rejected promise — let a later call retry (e.g. a transient
    // dev-Metro asset hiccup) instead of permanently wedging the embedder.
    modulePromise = null;
    throw error;
  });
  return modulePromise;
}

/**
 * Fire-and-forget boot warmer so the first `embedImage` call is fast. Swallows
 * its own error (incl. a missing native module in Expo Go) — a model-load
 * failure must never block app boot; the indexer (Story 2.3) decides recovery
 * when it calls `embedImage` for real.
 */
export function initModel(): void {
  getImageEmbedder().catch((error: unknown) => {
    console.warn("[model] initModel failed:", error);
  });
}

/** Test-only / teardown hook — resets the lazy singleton + init flag. */
export function __resetModelForTests(): void {
  modulePromise = null;
  initialized = false;
}
