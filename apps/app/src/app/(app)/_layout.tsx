import { Stack } from "expo-router";
import { router } from "expo-router";
import { View } from "react-native";
import { CloseButton } from "@/components/ui";
import { GroupProvider } from "@/lib/group";
import { stackHeader } from "@/lib/theme";
import { useTheme } from "@/lib/appearance";

export default function AppLayout() {
  const { c } = useTheme();
  return (
    <GroupProvider>
      <Stack screenOptions={stackHeader(c)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="game/new" options={{ presentation: "modal", headerLeft: () => <CloseButton onPress={() => router.back()} /> }} />
        {/* Scrolled game content must not pass under the back button, so the header gets a solid backing. */}
        <Stack.Screen name="game/[id]" options={{ headerBackground: () => <View style={{ flex: 1, backgroundColor: c.bgTop }} /> }} />
      </Stack>
    </GroupProvider>
  );
}
