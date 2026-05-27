// FR-2 (read-only): the SAF URI stored here MUST NEVER reach a mutating
// expo-file-system call. On any File or Directory built from this URI, do
// not invoke methods that create, mutate, or remove on-disk content, and do
// not open files in ReadWrite or Append mode. Allowed: pickDirectoryAsync,
// list, bytes, arrayBuffer, text, base64, readableStream, open in Read mode.
// Grep is the enforcement mechanism (see story 1.2 Task 6.2).

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "omnishot.folderUri";

export async function getFolderUri(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setFolderUri(uri: string): Promise<void> {
  await AsyncStorage.setItem(KEY, uri);
}

export async function clearFolderUri(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
