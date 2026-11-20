import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef } from "react";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from "expo-router";
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
  const sessionChecked = useRef(false);
  const pathname = usePathname();
  const publicEntry = pathname === "/" || pathname === "/sign-in" || pathname === "/quick-start"
    || pathname === "/join" || pathname === "/privacy" || pathname === "/support";
  if (!isPending) sessionChecked.current = true;
  // Keep cold links to protected screens intact while the first session resolves.
  if (!sessionChecked.current && !publicEntry) return null;

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
            {/* Local games and invite links are available with or without a session. */}
            <Stack.Screen name="quick-start" options={stackHeader(c)} />
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
