import { router } from "expo-router";
import { useState } from "react";
import { Button, Field, Heading, Notice, Row, Screen, T } from "@/components/ui";
import { authErrorMessage } from "@/components/auth-form";
import { authClient } from "@/lib/auth";
import { t } from "@/lib/i18n";

/** Account details and self-service deletion (required by App Store and Google Play). */
export default function Account() {
  const { data: session } = authClient.useSession();
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await authClient.deleteUser({ password });
    setBusy(false);
    if (res.error) setError(authErrorMessage(res.error));
  }

  return (
    <Screen>
      <T size={28} weight="800" style={{ marginTop: 48 }}>{t.account.title}</T>
      <Row>
        <T style={{ flex: 1 }}>{session?.user.name}</T>
        <T tone="muted" size={13}>{session?.user.email}</T>
      </Row>
      <Button title={t.account.privacy} variant="ghost" onPress={() => router.push("/privacy")} />
      <Button title={t.account.support} variant="ghost" onPress={() => router.push("/support")} />

      <Heading title={t.account.delete} />
      <T tone="muted" size={13}>{t.account.deleteText}</T>
      {confirming ? (
        <>
          <Field label={t.account.confirmPassword} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
          {error && <Notice>{error}</Notice>}
          <Button title={t.account.deletePermanently} onPress={remove} loading={busy} disabled={!password} />
        </>
      ) : (
        <Button title={t.account.delete} variant="ghost" onPress={() => setConfirming(true)} />
      )}
    </Screen>
  );
}
