import { create } from "zustand";

interface AppState {
  folderUri: string | null;
  setFolderUri: (uri: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  folderUri: null,
  setFolderUri: (uri) => set({ folderUri: uri }),
}));
