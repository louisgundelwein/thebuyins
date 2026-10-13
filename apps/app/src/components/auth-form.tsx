import { useState } from "react";
import { View } from "react-native";
import { Button, Field, Notice } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { dictionaries, type Dict } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";

type Mode = "sign-in" | "sign-up";

type AuthCode = keyof Dict["auth"]["errors"];
const isAuthCode = (code: string | undefined): code is AuthCode => code !== undefined && code in dictionaries.de.auth.errors;

/** Localized copy for a Better Auth error. Unknown codes get a generic line, never the server's English text. */
export function authErrorMessage(error: { code?: string }, t: Dict) {
  return isAuthCode(error.code) ? t.auth.errors[error.code] : t.common.failed;
}

/**
 * Email + password login and sign-up. Renders inside a `Screen`; on success the session
 * updates and whichever screen hosts the form re-renders (or the root guards redirect).
 */
export function AuthForm() {
  const { t } = useLanguage();
  const modes = [
    ["sign-in", t.auth.login],
    ["sign-up", t.auth.signUp],
  ] as const;
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
    if (error) setMessage(authErrorMessage(error, t));
  }

  return (
    <>
      <View style={{ flexDirection: "row", gap: 8, marginVertical: 6 }}>
        {modes.map(([m, label]) => (
          <View key={m} style={{ flex: 1 }}>
            <Button title={label} variant={mode === m ? "soft" : "ghost"} selected={mode === m} onPress={() => setMode(m)} />
          </View>
        ))}
      </View>

      {signUp && <Field label={t.common.name} value={name} onChangeText={setName} autoComplete="name" placeholder={t.auth.namePlaceholder} />}
      <Field label={t.auth.email} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label={t.auth.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete={signUp ? "new-password" : "current-password"} />
      {message && <Notice>{message}</Notice>}
      <Button title={signUp ? t.auth.createAccount : t.auth.signIn} onPress={submit} loading={busy} />
    </>
  );
}
