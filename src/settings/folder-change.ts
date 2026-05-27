export type FolderChangeOutcome =
  | { kind: "same" }
  | { kind: "changed"; nextUri: string }
  | { kind: "invalid" };

export function classifyFolderPick(
  currentUri: string | null,
  pickedUri: unknown,
): FolderChangeOutcome {
  if (typeof pickedUri !== "string") {
    return { kind: "invalid" };
  }
  const next = pickedUri.trim();
  if (next.length === 0) {
    return { kind: "invalid" };
  }
  if (currentUri !== null && next === currentUri.trim()) {
    return { kind: "same" };
  }
  return { kind: "changed", nextUri: next };
}
