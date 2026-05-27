import "../global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { useAppStore } from "@/store/app.store";

try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch {
  // Native module missing or sync throw at module load — let auto-hide proceed.
}

export default function RootLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  const folderUri = useAppStore((s) => s.folderUri);

  useEffect(() => {
    useAppStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (hydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [hydrated]);

  if (!hydrated) return null;

  const hasFolder = folderUri !== null && folderUri.length > 0;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!hasFolder}>
        <Stack.Screen name="onboarding/pick-folder" />
      </Stack.Protected>
      <Stack.Protected guard={hasFolder}>
        <Stack.Screen name="index" />
        <Stack.Screen name="settings" />
      </Stack.Protected>
    </Stack>
  );
}
