// FR-2 (read-only): this module only inspects the SAF tree URI; it never
// invokes any mutating expo-file-system API on the Directory. The contract is:
// construct, read the `exists` getter, optionally enumerate via `list()`. No
// other Directory method is allowed. See [folder-uri.storage.ts] for the
// canonical FR-2 invariant.

import { Directory } from "expo-file-system";

export type Reachability =
  | { reachable: true }
  | { reachable: false; reason: "missing" | "security" | "unknown"; error?: unknown };

// Expo SDK 56 emits `ERR_INVALID_PERMISSION` (from InvalidPermissionException
// in node_modules/expo-file-system/.../FileSystemExceptions.kt:26-27, code
// inferred via expo-modules-core CodedException.inferCode). We accept any
// `ERR_*PERMISSION*` code so future renames are caught without an update here.
const SECURITY_MESSAGE_PATTERN =
  /SecurityException|Permission Denial|Permission denied|EACCES|ERR_(?:NO|INVALID)_PERMISSION|Missing '[A-Z_]+' permission/i;
const MAX_CAUSE_DEPTH = 5;

function isSecurityCode(code: unknown): boolean {
  return (
    typeof code === "string" && code.startsWith("ERR_") && /PERMISSION/i.test(code)
  );
}

function isSecurityError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current != null; depth++) {
    if (isSecurityCode((current as { code?: unknown }).code)) return true;
    const message =
      current instanceof Error
        ? current.message
        : typeof current === "string"
          ? current
          : null;
    if (message != null && SECURITY_MESSAGE_PATTERN.test(message)) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function classifyThrow(error: unknown): Reachability {
  return isSecurityError(error)
    ? { reachable: false, reason: "security", error }
    : { reachable: false, reason: "unknown", error };
}

export function isFolderUriReachable(uri: string): Reachability {
  const trimmed = uri.trim();
  if (trimmed.length === 0) {
    return { reachable: false, reason: "missing" };
  }

  let dir: Directory;
  try {
    dir = new Directory(trimmed);
  } catch (error) {
    return classifyThrow(error);
  }

  try {
    if (!dir.exists) {
      return { reachable: false, reason: "missing" };
    }
  } catch (error) {
    return classifyThrow(error);
  }

  try {
    dir.list();
    return { reachable: true };
  } catch (error) {
    return classifyThrow(error);
  }
}
