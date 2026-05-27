import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useAppStore } from "@/store/app.store";

export default function Home() {
  const folderUri = useAppStore((s) => s.folderUri);

  return (
    <View className="flex-1 bg-white dark:bg-zinc-900">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => router.push("/settings")}
        style={{ position: "absolute", right: 16, top: 48, zIndex: 10 }}
        className="rounded-full px-3 py-2 active:opacity-70"
      >
        <Text className="text-zinc-700 dark:text-zinc-300">Settings</Text>
      </Pressable>
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          OmniShot
        </Text>
        <Text className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {folderUri ? `Folder: ${folderUri}` : "No folder selected yet."}
        </Text>
      </View>
    </View>
  );
}
