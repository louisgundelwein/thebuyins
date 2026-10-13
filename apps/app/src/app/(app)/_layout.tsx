import { Stack } from "expo-router";
import { router } from "expo-router";
import { View } from "react-native";
import { CloseButton } from "@/components/ui";
import { GroupProvider } from "@/lib/group";
import { c, stackHeader } from "@/lib/theme";

export default function AppLayout() {
  return (
    <GroupProvider>
      <Stack screenOptions={stackHeader}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="game/new" options={{ presentation: "modal", headerLeft: () => <CloseButton onPress={() => router.back()} /> }} />
        {/* Scrolled game content must not pass under the back button, so the header gets a solid backing. */}
        <Stack.Screen name="game/[id]" options={{ headerBackground: () => <View style={{ flex: 1, backgroundColor: c.bgTop }} /> }} />
      </Stack>
    </GroupProvider>
  );
}
