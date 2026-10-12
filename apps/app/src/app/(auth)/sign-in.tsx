import * as Linking from "expo-linking";
import { useState } from "react";
import { View } from "react-native";
import { Button, Field, Hero, Notice, Screen, T } from "@/components/ui";
import { authClient } from "@/lib/auth";

type Mode = "sign-in" | "sign-up" | "magic";

/** Email + password sign-in and sign-up, plus magic link as a password-free fallback. */
export default function SignIn() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setMessage(null);
    const { error } =
      mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signIn.magicLink({ email, callbackURL: Linking.createURL("/") });
    setBusy(false);
    if (error) setMessage(error.message ?? "Das hat nicht geklappt");
    else if (mode === "magic") setMessage("Link ist unterwegs, schau in dein Postfach.");
  }

  return (
    <Screen>
      <Hero style={{ marginTop: 40, alignItems: "center", paddingVertical: 32 }}>
        <T size={40} weight="800">♠ Homegame</T>
        <T tone="muted">Buy-ins tracken, fair abrechnen.</T>
      </Hero>

      <View style={{ flexDirection: "row", gap: 8, marginVertical: 6 }}>
        {(["sign-in", "sign-up", "magic"] as const).map((m) => (
          <View key={m} style={{ flex: 1 }}>
            <Button title={m === "sign-in" ? "Login" : m === "sign-up" ? "Registrieren" : "Magic Link"} variant={mode === m ? "soft" : "ghost"} onPress={() => setMode(m)} />
          </View>
        ))}
      </View>

      {mode === "sign-up" && <Field label="Name" value={name} onChangeText={setName} autoComplete="name" placeholder="Wie dich die Runde nennt" />}
      <Field label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      {mode !== "magic" && <Field label="Passwort" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "sign-up" ? "new-password" : "current-password"} />}
      {message && <Notice>{message}</Notice>}
      <Button title={mode === "sign-up" ? "Account erstellen" : mode === "magic" ? "Link senden" : "Einloggen"} onPress={submit} loading={busy} />
    </Screen>
  );
}
