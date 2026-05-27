import { describe, expect, it } from "@jest/globals";

import { isPickerCancellation } from "@/onboarding/picker-cancellation";

describe("isPickerCancellation", () => {
  it("matches the canonical ERR_PICKER_CANCELLED code", () => {
    expect(isPickerCancellation({ code: "ERR_PICKER_CANCELLED" })).toBe(true);
  });

  it("matches the code on a wrapped cause (FunctionCallException → CodedException)", () => {
    const wrapped = Object.assign(new Error("wrapper"), {
      cause: { code: "ERR_PICKER_CANCELLED" },
    });
    expect(isPickerCancellation(wrapped)).toBe(true);
  });

  it("falls back to matching the literal 'cancelled' wording in the message", () => {
    expect(
      isPickerCancellation(new Error("The file picker was cancelled by the user")),
    ).toBe(true);
  });

  it("does not match arbitrary failures", () => {
    expect(isPickerCancellation(new Error("permission denied"))).toBe(false);
    expect(isPickerCancellation({ code: "ERR_OTHER" })).toBe(false);
    expect(isPickerCancellation("string error")).toBe(false);
  });

  it("does not match the verb 'rejected' that wraps every Expo error message", () => {
    expect(
      isPickerCancellation(
        new Error("Call to function 'FileSystem.pickDirectoryAsync' has been rejected."),
      ),
    ).toBe(false);
  });

  it("does not match the substring 'cancel' (only the full word 'cancelled')", () => {
    expect(isPickerCancellation(new Error("operation cancel pending"))).toBe(false);
  });

  it("does not match inflected substrings containing 'cancelled' (word-boundary regex)", () => {
    expect(isPickerCancellation(new Error("uncancelled request"))).toBe(false);
    expect(isPickerCancellation(new Error("cancelledcallbackmap corruption"))).toBe(false);
    expect(isPickerCancellation(new Error("precancelled-task"))).toBe(false);
  });

  it("handles null and undefined without throwing", () => {
    expect(isPickerCancellation(null)).toBe(false);
    expect(isPickerCancellation(undefined)).toBe(false);
  });
});
