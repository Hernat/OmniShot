import { create } from "zustand";

import {
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
        set({ folderUri: normalized, hydrated: true });
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
