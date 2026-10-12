import { Stack } from "expo-router";
import { GroupProvider } from "@/lib/group";
import { c } from "@/lib/theme";

export default function AppLayout() {
  return (
    <GroupProvider>
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerTitle: "",
          headerTintColor: c.text,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="game/new" options={{ presentation: "modal" }} />
      </Stack>
    </GroupProvider>
  );
}
