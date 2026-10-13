import { AuthForm } from "@/components/auth-form";
import { Hero, Screen, T } from "@/components/ui";
import { t } from "@/lib/i18n";

/** Landing screen for signed-out users. */
export default function SignIn() {
  return (
    <Screen>
      <Hero style={{ marginTop: 40, alignItems: "center", paddingVertical: 32 }}>
        <T size={40} weight="800">
          <T size={40} weight="800" importantForAccessibility="no" accessibilityElementsHidden>♠ </T>
          The Buy-Ins
        </T>
        <T tone="muted">{t.auth.tagline}</T>
      </Hero>
      <AuthForm />
    </Screen>
  );
}
