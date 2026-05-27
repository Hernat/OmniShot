import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-file-system", () => ({
  Directory: jest.fn(),
}));

import { Directory } from "expo-file-system";

import { isFolderUriReachable } from "@/onboarding/folder-uri-reachability";

// `jest.mocked` typing on class constructors deeply wraps every instance member
// as a MockedObject which would force every `list`/`exists` to be a MockedFunction
// in our test doubles. We deliberately return plain test doubles, so a single
// `as unknown as jest.Mock` cast on the constructor is the pragmatic typing here.
const DirectoryMock = Directory as unknown as jest.Mock;

type ListReturn = (string | number)[];

interface MockDirectoryOpts {
  exists: boolean | (() => never);
  list: () => ListReturn;
}

function mockDirectory(opts: MockDirectoryOpts) {
  DirectoryMock.mockImplementation(() => ({
    get exists() {
      if (typeof opts.exists === "function") {
        opts.exists();
      }
      return opts.exists as boolean;
    },
    list: opts.list,
  }));
}

beforeEach(() => {
  DirectoryMock.mockReset();
});

describe("isFolderUriReachable", () => {
  it("returns missing for an empty URI without constructing a Directory", () => {
    const result = isFolderUriReachable("");
    expect(result).toEqual({ reachable: false, reason: "missing" });
    expect(DirectoryMock).not.toHaveBeenCalled();
  });

  it("returns missing for a whitespace-only URI without constructing a Directory", () => {
    const result = isFolderUriReachable("   ");
    expect(result).toEqual({ reachable: false, reason: "missing" });
    expect(DirectoryMock).not.toHaveBeenCalled();
  });

  it("trims surrounding whitespace before passing the URI to Directory", () => {
    mockDirectory({ exists: true, list: () => [] });

    const result = isFolderUriReachable("  content://valid  ");

    expect(result).toEqual({ reachable: true });
    expect(DirectoryMock).toHaveBeenCalledWith("content://valid");
  });

  it("returns reachable when Directory.exists is true and list() succeeds", () => {
    const listSpy = jest.fn<() => ListReturn>(() => []);
    mockDirectory({ exists: true, list: listSpy });

    const result = isFolderUriReachable("content://valid");

    expect(result).toEqual({ reachable: true });
    expect(DirectoryMock).toHaveBeenCalledWith("content://valid");
    expect(listSpy).toHaveBeenCalledTimes(1);
  });

  it("returns missing without calling list() when Directory.exists is false", () => {
    const listSpy = jest.fn<() => ListReturn>(() => []);
    mockDirectory({ exists: false, list: listSpy });

    const result = isFolderUriReachable("content://gone");

    expect(result).toEqual({ reachable: false, reason: "missing" });
    expect(listSpy).not.toHaveBeenCalled();
  });

  it("classifies list() throws with code ERR_NO_PERMISSION as security", () => {
    const err = Object.assign(new Error("opaque list failure"), {
      code: "ERR_NO_PERMISSION",
    });
    mockDirectory({
      exists: true,
      list: () => {
        throw err;
      },
    });

    const result = isFolderUriReachable("content://revoked");

    expect(result).toEqual({
      reachable: false,
      reason: "security",
      error: err,
    });
  });

  it("classifies list() throws with code ERR_INVALID_PERMISSION as security (Expo SDK 56 actual code)", () => {
    const err = Object.assign(new Error("opaque list failure"), {
      code: "ERR_INVALID_PERMISSION",
    });
    mockDirectory({
      exists: true,
      list: () => {
        throw err;
      },
    });

    const result = isFolderUriReachable("content://invalid-perm");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
    }
  });

  it("classifies list() throws with arbitrary ERR_*PERMISSION* code as security", () => {
    const err = Object.assign(new Error("opaque list failure"), {
      code: "ERR_SAF_PERMISSION_REVOKED",
    });
    mockDirectory({
      exists: true,
      list: () => {
        throw err;
      },
    });

    const result = isFolderUriReachable("content://future-code");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
    }
  });

  it("classifies list() throws with Expo InvalidPermissionException message format as security", () => {
    const err = new Error("Missing 'READ' permission for accessing the file.");
    mockDirectory({
      exists: true,
      list: () => {
        throw err;
      },
    });

    const result = isFolderUriReachable("content://expo-missing-read");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
    }
  });

  it("classifies list() throws containing lowercase 'Permission denied' as security", () => {
    const err = new Error("Permission denied opening tree URI");
    mockDirectory({
      exists: true,
      list: () => {
        throw err;
      },
    });

    const result = isFolderUriReachable("content://lowercase-denied");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
    }
  });

  it("classifies list() throws containing 'EACCES' as security", () => {
    const err = new Error("Operation not permitted: EACCES");
    mockDirectory({
      exists: true,
      list: () => {
        throw err;
      },
    });

    const result = isFolderUriReachable("content://eacces");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
    }
  });

  it("classifies list() throws containing 'SecurityException' as security", () => {
    const err = new Error("SecurityException: Permission Denial reading content://x");
    mockDirectory({
      exists: true,
      list: () => {
        throw err;
      },
    });

    const result = isFolderUriReachable("content://revoked-2");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
      expect(result.error).toBe(err);
    }
  });

  it("classifies list() throws containing 'Permission Denial' as security", () => {
    const err = new Error("Permission Denial: opening provider for content://no-perm");
    mockDirectory({
      exists: true,
      list: () => {
        throw err;
      },
    });

    const result = isFolderUriReachable("content://no-perm");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
    }
  });

  it("classifies an unrelated list() throw as unknown", () => {
    const err = new Error("disk pulled out");
    mockDirectory({
      exists: true,
      list: () => {
        throw err;
      },
    });

    const result = isFolderUriReachable("content://weird");

    expect(result).toEqual({
      reachable: false,
      reason: "unknown",
      error: err,
    });
  });

  it("does NOT classify an unrelated error mentioning the word 'permission' as security", () => {
    const err = new Error("Missing permission.json config file");
    mockDirectory({
      exists: true,
      list: () => {
        throw err;
      },
    });

    const result = isFolderUriReachable("content://generic-perm-word");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("unknown");
    }
  });

  it("classifies constructor throws via security code only (no security keywords in message)", () => {
    const err = Object.assign(new Error("opaque construct failure"), {
      code: "ERR_INVALID_PERMISSION",
    });
    DirectoryMock.mockImplementation(() => {
      throw err;
    });

    const result = isFolderUriReachable("content://ctor-code-only");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
      expect(result.error).toBe(err);
    }
  });

  it("classifies constructor throws via security message only (no code)", () => {
    const err = new Error("SecurityException: revoked at construct");
    DirectoryMock.mockImplementation(() => {
      throw err;
    });

    const result = isFolderUriReachable("content://ctor-msg-only");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
      expect(result.error).toBe(err);
    }
  });

  it("classifies constructor throws as unknown when not security-flavored", () => {
    const err = new Error("constructor exploded");
    DirectoryMock.mockImplementation(() => {
      throw err;
    });

    const result = isFolderUriReachable("content://bad-shape");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("unknown");
    }
  });

  it("classifies Directory.exists getter throws via security code only (no security keywords in message)", () => {
    const err = Object.assign(new Error("opaque getter failure"), {
      code: "ERR_INVALID_PERMISSION",
    });
    mockDirectory({
      exists: () => {
        throw err;
      },
      list: () => [],
    });

    const result = isFolderUriReachable("content://exists-code-only");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
      expect(result.error).toBe(err);
    }
  });

  it("classifies Directory.exists getter throws via security message only (no code)", () => {
    const err = new Error("SecurityException reading tree URI");
    mockDirectory({
      exists: () => {
        throw err;
      },
      list: () => [],
    });

    const result = isFolderUriReachable("content://exists-msg-only");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
      expect(result.error).toBe(err);
    }
  });

  it("classifies Directory.exists getter throws (unknown branch)", () => {
    const err = new Error("ContentResolver hiccup");
    mockDirectory({
      exists: () => {
        throw err;
      },
      list: () => [],
    });

    const result = isFolderUriReachable("content://exists-weird");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("unknown");
      expect(result.error).toBe(err);
    }
  });

  it("walks the cause chain to find ERR_*PERMISSION* code two levels deep", () => {
    const inner = Object.assign(new Error("inner"), { code: "ERR_INVALID_PERMISSION" });
    const middle = Object.assign(new Error("middle wrap"), { cause: inner });
    const outer = Object.assign(new Error("outer wrap"), { cause: middle });
    mockDirectory({
      exists: true,
      list: () => {
        throw outer;
      },
    });

    const result = isFolderUriReachable("content://nested-cause-code");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
    }
  });

  it("walks the cause chain to find a security-flavored message two levels deep (no code anywhere)", () => {
    const inner = new Error("SecurityException: revoked");
    const middle = Object.assign(new Error("middle wrap (generic)"), { cause: inner });
    const outer = Object.assign(new Error("outer wrap (generic)"), { cause: middle });
    mockDirectory({
      exists: true,
      list: () => {
        throw outer;
      },
    });

    const result = isFolderUriReachable("content://nested-cause-msg");

    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(result.reason).toBe("security");
    }
  });
});
