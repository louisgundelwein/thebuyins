import { useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppearanceProvider, useTheme } from "@/lib/appearance";
import { authClient } from "@/lib/auth";
import { LanguageProvider } from "@/lib/language";
import { useForceUpdate } from "@/lib/update";
import { stackHeader } from "@/lib/theme";

export { ErrorBoundary } from "expo-router";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <LanguageProvider>
        <RootNavigator />
      </LanguageProvider>
    </AppearanceProvider>
  );
}

/** Appearance updates navigation and system bars without replacing the active route. */
function RootNavigator() {
  const { c, scheme } = useTheme();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.sheet, text: c.text, primary: c.accent, border: c.border, notification: c.neg },
  };
  const { data: session, isPending } = authClient.useSession();
  // Better Auth refetches the session on foreground. Block only the first load so forms survive.
  const loaded = useRef(false);
  if (!isPending) loaded.current = true;
  if (!loaded.current) return null;

  return (
    <>
      <ForceUpdate />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={theme}>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
            <Stack.Protected guard={!!session}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="(auth)/sign-in" />
            </Stack.Protected>
            {/* Unguarded so invite links work signed in or out. Last so it never becomes the default route. */}
            <Stack.Screen name="join" options={stackHeader(c)} />
            <Stack.Screen name="privacy" options={stackHeader(c)} />
            <Stack.Screen name="support" options={stackHeader(c)} />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}

/** The update alert uses the active language. */
function ForceUpdate() {
  useForceUpdate();
  return null;
}
