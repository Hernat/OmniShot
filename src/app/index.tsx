import { View, Text } from "react-native";

import { useAppStore } from "@/store/app.store";

export default function Home() {
  const folderUri = useAppStore((s) => s.folderUri);

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-900">
      <Text className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        OmniShot
      </Text>
      <Text className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {folderUri ? `Folder: ${folderUri}` : "No folder selected yet."}
      </Text>
    </View>
  );
}
