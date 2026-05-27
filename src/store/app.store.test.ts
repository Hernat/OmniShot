import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAppStore } from "@/store/app.store";

const KEY = "omnishot.folderUri";

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppStore.setState({ folderUri: null, hydrated: false });
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("useAppStore — hydrate", () => {
  it("starts un-hydrated with no folder", () => {
    const { hydrated, folderUri } = useAppStore.getState();
    expect(hydrated).toBe(false);
    expect(folderUri).toBeNull();
  });

  it("reads the persisted URI on first call and flips hydrated", async () => {
    await AsyncStorage.setItem(KEY, "content://saved-folder");
    await useAppStore.getState().hydrate();
    const { hydrated, folderUri } = useAppStore.getState();
    expect(hydrated).toBe(true);
    expect(folderUri).toBe("content://saved-folder");
  });

  it("normalises empty string to null when hydrating", async () => {
    await AsyncStorage.setItem(KEY, "");
    await useAppStore.getState().hydrate();
    expect(useAppStore.getState().folderUri).toBeNull();
    expect(useAppStore.getState().hydrated).toBe(true);
  });

  it("is idempotent sequentially — second call after first completes does not re-read storage", async () => {
    await AsyncStorage.setItem(KEY, "content://saved");
    const getItemSpy = jest.spyOn(AsyncStorage, "getItem");
    await useAppStore.getState().hydrate();
    await useAppStore.getState().hydrate();
    expect(getItemSpy).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().folderUri).toBe("content://saved");
  });

  it("collapses concurrent calls into a single storage read (in-flight promise reuse)", async () => {
    await AsyncStorage.setItem(KEY, "content://saved");
    const getItemSpy = jest.spyOn(AsyncStorage, "getItem");
    const a = useAppStore.getState().hydrate();
    const b = useAppStore.getState().hydrate();
    await Promise.all([a, b]);
    expect(getItemSpy).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().folderUri).toBe("content://saved");
  });

  it("flips hydrated to true and clears folderUri when storage rejects", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("boom"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    await useAppStore.getState().hydrate();
    expect(useAppStore.getState().hydrated).toBe(true);
    expect(useAppStore.getState().folderUri).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});

describe("useAppStore — setFolderUri", () => {
  it("persists then updates in-memory state", async () => {
    await useAppStore.getState().setFolderUri("content://X");
    expect(useAppStore.getState().folderUri).toBe("content://X");
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe("content://X");
  });

  it("rejects an empty URI and leaves state untouched", async () => {
    await expect(useAppStore.getState().setFolderUri("")).rejects.toThrow(
      /refusing to persist empty/i,
    );
    expect(useAppStore.getState().folderUri).toBeNull();
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });

  it("rejects a whitespace-only URI", async () => {
    await expect(useAppStore.getState().setFolderUri("   ")).rejects.toThrow(
      /refusing to persist empty/i,
    );
    expect(useAppStore.getState().folderUri).toBeNull();
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });

  it("trims leading/trailing whitespace before persisting", async () => {
    await useAppStore.getState().setFolderUri("  content://Y  ");
    expect(useAppStore.getState().folderUri).toBe("content://Y");
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe("content://Y");
  });

  it("preserves the previous folderUri when a subsequent write fails", async () => {
    await useAppStore.getState().setFolderUri("content://prev");
    expect(useAppStore.getState().folderUri).toBe("content://prev");
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockRejectedValueOnce(new Error("disk full"));
    await expect(
      useAppStore.getState().setFolderUri("content://new"),
    ).rejects.toThrow(/disk full/);
    expect(useAppStore.getState().folderUri).toBe("content://prev");
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe("content://prev");
  });
});
