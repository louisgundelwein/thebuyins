import { useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { authClient } from "@/lib/auth";
import { LanguageProvider } from "@/lib/language";
import { useForceUpdate } from "@/lib/update";
import { c, stackHeader } from "@/lib/theme";

const queryClient = new QueryClient();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.bg, primary: c.accent } };

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  // Better Auth refetches the session when the app returns to the foreground and, while signed
  // out, flips isPending back to true. Only block on the first load, or the whole tree remounts
  // and a half-filled sign-in form is wiped.
  const loaded = useRef(false);
  if (!isPending) loaded.current = true;
  if (!loaded.current) return null;

  return (
    <LanguageProvider>
      <ForceUpdate />
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
            {/* Unguarded so invite links work signed in or out. Declared last so it never becomes the fallback route. */}
            <Stack.Screen name="join" options={stackHeader} />
            {/* Public pages linked from the store listings. */}
            <Stack.Screen name="privacy" options={stackHeader} />
            <Stack.Screen name="support" options={stackHeader} />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

// Lives inside LanguageProvider because the alert needs translated strings.
function ForceUpdate() {
  useForceUpdate();
  return null;
}
