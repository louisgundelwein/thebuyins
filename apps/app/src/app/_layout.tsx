import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { authClient } from "@/lib/auth";
import { c } from "@/lib/theme";

const queryClient = new QueryClient();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.bg, primary: c.accent } };

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)/sign-in" />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
