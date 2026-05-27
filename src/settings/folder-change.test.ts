import { describe, expect, it } from "@jest/globals";

import { classifyFolderPick } from "@/settings/folder-change";

describe("classifyFolderPick", () => {
  it("returns invalid when pickedUri is null", () => {
    expect(classifyFolderPick("content://abc", null)).toEqual({
      kind: "invalid",
    });
  });

  it("returns invalid when pickedUri is undefined", () => {
    expect(classifyFolderPick("content://abc", undefined)).toEqual({
      kind: "invalid",
    });
  });

  it("returns invalid when pickedUri is a non-string", () => {
    expect(classifyFolderPick("content://abc", 123)).toEqual({
      kind: "invalid",
    });
  });

  it("returns invalid when pickedUri is a Directory-shaped object (caller passed the wrong field)", () => {
    expect(
      classifyFolderPick("content://abc", { uri: "content://xyz" }),
    ).toEqual({ kind: "invalid" });
  });

  it("returns invalid when pickedUri is an empty string", () => {
    expect(classifyFolderPick("content://abc", "")).toEqual({
      kind: "invalid",
    });
  });

  it("returns invalid when pickedUri is whitespace only", () => {
    expect(classifyFolderPick("content://abc", "   ")).toEqual({
      kind: "invalid",
    });
  });

  it("returns changed when currentUri is null and pickedUri is a valid string", () => {
    expect(classifyFolderPick(null, "content://abc")).toEqual({
      kind: "changed",
      nextUri: "content://abc",
    });
  });

  it("trims pickedUri even when currentUri is null (no short-circuit on null current)", () => {
    expect(classifyFolderPick(null, "  content://abc  ")).toEqual({
      kind: "changed",
      nextUri: "content://abc",
    });
  });

  it("returns same when pickedUri exactly matches currentUri", () => {
    expect(classifyFolderPick("content://abc", "content://abc")).toEqual({
      kind: "same",
    });
  });

  it("returns same when pickedUri matches currentUri after trimming", () => {
    expect(
      classifyFolderPick("content://abc", "  content://abc  "),
    ).toEqual({ kind: "same" });
  });

  it("returns changed with the trimmed next URI when pickedUri differs", () => {
    expect(classifyFolderPick("content://abc", "content://xyz")).toEqual({
      kind: "changed",
      nextUri: "content://xyz",
    });
  });

  it("trims surrounding whitespace from a changed URI", () => {
    expect(
      classifyFolderPick("content://abc", "  content://xyz  "),
    ).toEqual({ kind: "changed", nextUri: "content://xyz" });
  });
});
