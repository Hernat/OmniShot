import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearFolderUri,
  getFolderUri,
  setFolderUri,
} from "@/storage/folder-uri.storage";

const KEY = "omnishot.folderUri";

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe("folder-uri.storage", () => {
  it("returns null when nothing has been persisted", async () => {
    await expect(getFolderUri()).resolves.toBeNull();
  });

  it("round-trips a persisted URI", async () => {
    await setFolderUri(
      "content://com.android.externalstorage.documents/tree/primary%3AScreenshots",
    );
    await expect(getFolderUri()).resolves.toBe(
      "content://com.android.externalstorage.documents/tree/primary%3AScreenshots",
    );
  });

  it("setFolderUri calls AsyncStorage.setItem exactly once with the documented key", async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, "setItem");
    await setFolderUri("content://foo");
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith(KEY, "content://foo");
  });

  it("clearFolderUri calls AsyncStorage.removeItem exactly once with the documented key", async () => {
    const removeItemSpy = jest.spyOn(AsyncStorage, "removeItem");
    await setFolderUri("content://foo");
    await clearFolderUri();
    expect(removeItemSpy).toHaveBeenCalledTimes(1);
    expect(removeItemSpy).toHaveBeenCalledWith(KEY);
    await expect(getFolderUri()).resolves.toBeNull();
  });
});
