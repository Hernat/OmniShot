import { create } from "zustand";

import { isFolderUriReachable } from "@/onboarding/folder-uri-reachability";
import {
  clearFolderUri,
  getFolderUri,
  setFolderUri as persistFolderUri,
} from "@/storage/folder-uri.storage";

interface AppState {
  folderUri: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setFolderUri: (uri: string) => Promise<void>;
}

let hydratePromise: Promise<void> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  folderUri: null,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return Promise.resolve();
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      try {
        const stored = await getFolderUri();
        const normalized = stored && stored.length > 0 ? stored : null;
        let resolved: string | null = normalized;
        if (normalized !== null) {
          const result = isFolderUriReachable(normalized);
          if (!result.reachable) {
            console.warn(
              "[store] persisted folder URI is unreachable — dropping",
              { reason: result.reason, error: result.error },
            );
            try {
              await clearFolderUri();
            } catch (clearErr) {
              console.warn(
                "[store] clearFolderUri after reachability fail also failed:",
                clearErr,
              );
            }
            resolved = null;
          }
        }
        set({ folderUri: resolved, hydrated: true });
      } catch (error) {
        console.warn("[store] hydrate failed:", error);
        set({ folderUri: null, hydrated: true });
      } finally {
        hydratePromise = null;
      }
    })();
    return hydratePromise;
  },
  setFolderUri: async (uri) => {
    const trimmed = uri.trim();
    if (trimmed.length === 0) {
      throw new Error("setFolderUri: refusing to persist empty URI");
    }
    await persistFolderUri(trimmed);
    set({ folderUri: trimmed });
  },
}));
