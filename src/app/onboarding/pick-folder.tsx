import { Directory } from "expo-file-system";
import { Platform, Pressable, Text, View } from "react-native";

import { isPickerCancellation } from "@/onboarding/picker-cancellation";
import { useAppStore } from "@/store/app.store";

export default function PickFolder() {
  const onPickFolder = async () => {
    if (Platform.OS !== "android") {
      console.warn("[onboarding] pickDirectoryAsync is Android-only");
      return;
    }

    let directory: Directory;
    try {
      directory = await Directory.pickDirectoryAsync();
    } catch (error) {
      if (isPickerCancellation(error)) return;
      console.warn("[onboarding] pickDirectoryAsync failed:", error);
      return;
    }

    if (!directory?.uri || directory.uri.length === 0) {
      console.warn("[onboarding] picker returned empty URI");
      return;
    }

    try {
      await useAppStore.getState().setFolderUri(directory.uri);
    } catch (error) {
      console.warn("[onboarding] setFolderUri failed:", error);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-zinc-900">
      <Text
        accessibilityRole="header"
        className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100"
      >
        OmniShot
      </Text>
      <Text className="mb-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Choose the folder OmniShot should index. Read-only — your screenshots
        stay where they are.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPickFolder}
        className="rounded-full bg-zinc-900 px-6 py-3 active:opacity-70 dark:bg-zinc-100"
      >
        <Text className="text-base font-medium text-white dark:text-zinc-900">
          Pick folder
        </Text>
      </Pressable>
    </View>
  );
}
