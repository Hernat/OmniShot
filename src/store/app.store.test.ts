import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@/onboarding/folder-uri-reachability", () => ({
  isFolderUriReachable: jest.fn(() => ({ reachable: true })),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

import { isFolderUriReachable } from "@/onboarding/folder-uri-reachability";
import { useAppStore } from "@/store/app.store";

const KEY = "omnishot.folderUri";

const reachabilityMock = jest.mocked(isFolderUriReachable);

beforeEach(async () => {
  await AsyncStorage.clear();
  useAppStore.setState({ folderUri: null, hydrated: false });
  jest.restoreAllMocks();
  jest.clearAllMocks();
  reachabilityMock.mockReturnValue({ reachable: true });
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

describe("useAppStore — hydrate revoked-permission recovery", () => {
  it("keeps the URI when reachability check returns reachable: true", async () => {
    await AsyncStorage.setItem(KEY, "content://reachable");
    reachabilityMock.mockReturnValue({ reachable: true });

    await useAppStore.getState().hydrate();

    expect(useAppStore.getState().folderUri).toBe("content://reachable");
    expect(useAppStore.getState().hydrated).toBe(true);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe("content://reachable");
    expect(reachabilityMock).toHaveBeenCalledWith("content://reachable");
  });

  it("drops a security-revoked URI from memory and from AsyncStorage", async () => {
    await AsyncStorage.setItem(KEY, "content://revoked");
    reachabilityMock.mockReturnValue({
      reachable: false,
      reason: "security",
      error: new Error("Permission Denial"),
    });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    await useAppStore.getState().hydrate();

    expect(useAppStore.getState().folderUri).toBeNull();
    expect(useAppStore.getState().hydrated).toBe(true);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
    const warnPayload = warn.mock.calls[0]?.[1] as { reason?: string } | undefined;
    expect(warnPayload?.reason).toBe("security");
  });

  it("drops a missing-target URI from memory and from AsyncStorage", async () => {
    await AsyncStorage.setItem(KEY, "content://gone");
    reachabilityMock.mockReturnValue({ reachable: false, reason: "missing" });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    await useAppStore.getState().hydrate();

    expect(useAppStore.getState().folderUri).toBeNull();
    expect(useAppStore.getState().hydrated).toBe(true);
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
    const warnPayload = warn.mock.calls[0]?.[1] as { reason?: string } | undefined;
    expect(warnPayload?.reason).toBe("missing");
  });

  it("still drops the in-memory URI when clearFolderUri itself rejects (storage remains stale)", async () => {
    await AsyncStorage.setItem(KEY, "content://stuck");
    reachabilityMock.mockReturnValue({ reachable: false, reason: "security" });
    jest
      .spyOn(AsyncStorage, "removeItem")
      .mockRejectedValueOnce(new Error("storage broken"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    await useAppStore.getState().hydrate();

    expect(useAppStore.getState().folderUri).toBeNull();
    expect(useAppStore.getState().hydrated).toBe(true);
    // Assert the two specific warns happened by content rather than exact count
    // (resilient to future log additions in the recovery path).
    expect(warn.mock.calls.length).toBeGreaterThanOrEqual(2);
    const warnMessages = warn.mock.calls.map((args) => String(args[0] ?? ""));
    expect(
      warnMessages.some((m) => m.includes("persisted folder URI is unreachable")),
    ).toBe(true);
    expect(
      warnMessages.some((m) => m.includes("clearFolderUri after reachability fail")),
    ).toBe(true);
    // Spec-accepted "best effort": when removeItem rejects, the in-memory drop
    // wins (folderUri === null routes user to onboarding via Stack.Protected)
    // but AsyncStorage retains the unreachable URI. Documented behavior, not a
    // bug — flagged for follow-up in deferred-work.md (Story 1.3 review).
    await expect(AsyncStorage.getItem(KEY)).resolves.toBe("content://stuck");
  });

  it("does not call the reachability check when storage has no URI", async () => {
    await useAppStore.getState().hydrate();

    expect(useAppStore.getState().folderUri).toBeNull();
    expect(useAppStore.getState().hydrated).toBe(true);
    expect(reachabilityMock).not.toHaveBeenCalled();
  });
});
