import { useState } from "react";
import { View } from "react-native";
import { Button, Field, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth";

const modes = [
  ["sign-in", "Login"],
  ["sign-up", "Registrieren"],
] as const;
type Mode = (typeof modes)[number][0];

/**
 * Email + password login and sign-up. Renders inside a `Screen`; on success the session
 * updates and whichever screen hosts the form re-renders (or the root guards redirect).
 */
export function AuthForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const signUp = mode === "sign-up";

  async function submit() {
    setBusy(true);
    setMessage(null);
    const { error } = signUp ? await authClient.signUp.email({ name, email, password }) : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) setMessage(error.message ?? "Das hat nicht geklappt");
  }

  return (
    <>
      <View style={{ flexDirection: "row", gap: 8, marginVertical: 6 }}>
        {modes.map(([m, label]) => (
          <View key={m} style={{ flex: 1 }}>
            <Button title={label} variant={mode === m ? "soft" : "ghost"} onPress={() => setMode(m)} />
          </View>
        ))}
      </View>

      {signUp && <Field label="Name" value={name} onChangeText={setName} autoComplete="name" placeholder="Wie dich die Runde nennt" />}
      <Field label="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Passwort" value={password} onChangeText={setPassword} secureTextEntry autoComplete={signUp ? "new-password" : "current-password"} />
      {message && <Notice>{message}</Notice>}
      <Button title={signUp ? "Account erstellen" : "Einloggen"} onPress={submit} loading={busy} />
    </>
  );
}
