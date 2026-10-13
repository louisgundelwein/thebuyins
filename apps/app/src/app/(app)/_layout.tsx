import { Stack } from "expo-router";
import { router } from "expo-router";
import { CloseButton } from "@/components/ui";
import { GroupProvider } from "@/lib/group";
import { stackHeader } from "@/lib/theme";

export default function AppLayout() {
  return (
    <GroupProvider>
      <Stack screenOptions={stackHeader}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="game/new" options={{ presentation: "modal", headerRight: () => <CloseButton onPress={() => router.back()} /> }} />
      </Stack>
    </GroupProvider>
  );
}
