import { AuthForm } from "@/components/auth-form";
import { Hero, Screen, T } from "@/components/ui";
import { useLanguage } from "@/lib/language";

/** Landing screen for signed-out users. */
export default function SignIn() {
  const { t } = useLanguage();
  return (
    <Screen>
      <Hero style={{ marginTop: 40, alignItems: "center", paddingVertical: 32 }}>
        <T size={40} weight="800" accessibilityLabel="The Buy-Ins">♠ The Buy-Ins</T>
        <T tone="muted">{t.auth.tagline}</T>
      </Hero>
      <AuthForm />
    </Screen>
  );
}
