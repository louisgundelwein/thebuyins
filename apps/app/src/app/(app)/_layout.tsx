import { Stack } from "expo-router";
import { c } from "@/lib/theme";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerTitle: "",
        headerTintColor: c.text,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
