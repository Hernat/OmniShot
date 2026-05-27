import { Directory } from "expo-file-system";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { isPickerCancellation } from "@/onboarding/picker-cancellation";
import { classifyFolderPick } from "@/settings/folder-change";
import { useAppStore } from "@/store/app.store";

function popOrFallbackHome(): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/");
  }
}

export default function Settings() {
  const folderUri = useAppStore((s) => s.folderUri);
  const [isBusy, setIsBusy] = useState(false);

  const onChangeFolder = async () => {
    if (isBusy) return;
    if (Platform.OS !== "android") {
      console.warn("[settings] pickDirectoryAsync is Android-only");
      return;
    }

    setIsBusy(true);
    try {
      let directory: Directory | undefined;
      try {
        directory = await Directory.pickDirectoryAsync();
      } catch (error) {
        if (isPickerCancellation(error)) return;
        console.warn("[settings] pickDirectoryAsync failed:", error);
        return;
      }

      const currentUri = useAppStore.getState().folderUri;
      const outcome = classifyFolderPick(currentUri, directory?.uri);

      if (outcome.kind === "invalid") {
        console.warn("[settings] picker returned empty/invalid URI");
        return;
      }

      if (outcome.kind === "same") {
        popOrFallbackHome();
        return;
      }

      try {
        await useAppStore.getState().setFolderUri(outcome.nextUri);
      } catch (error) {
        console.warn("[settings] setFolderUri failed:", error);
        return;
      }

      popOrFallbackHome();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-8 pt-16 dark:bg-zinc-900">
      <Text
        accessibilityRole="header"
        className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100"
      >
        Settings
      </Text>
      <Text
        numberOfLines={2}
        className="mb-10 text-sm text-zinc-500 dark:text-zinc-400"
      >
        {folderUri
          ? `Current folder: ${folderUri}`
          : "No folder selected yet."}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isBusy }}
        disabled={isBusy}
        onPress={onChangeFolder}
        className="self-start rounded-full bg-zinc-900 px-6 py-3 active:opacity-70 disabled:opacity-50 dark:bg-zinc-100"
      >
        <Text className="text-base font-medium text-white dark:text-zinc-900">
          Change folder
        </Text>
      </Pressable>
    </View>
  );
}
