import { AuthForm } from "@/components/auth-form";
import { Hero, Screen, T } from "@/components/ui";

/** Landing screen for signed-out users. */
export default function SignIn() {
  return (
    <Screen>
      <Hero style={{ marginTop: 40, alignItems: "center", paddingVertical: 32 }}>
        <T size={40} weight="800">♠ The Buy-Ins</T>
        <T tone="muted">Buy-ins tracken, fair abrechnen.</T>
      </Hero>
      <AuthForm />
    </Screen>
  );
}
