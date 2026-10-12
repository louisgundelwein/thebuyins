import { router } from "expo-router";
import { useState } from "react";
import { Button, Field, Heading, Notice, Row, Screen, T } from "@/components/ui";
import { authClient } from "@/lib/auth";

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
    if (res.error) setError(res.error.message ?? "Löschen fehlgeschlagen");
  }

  return (
    <Screen>
      <T size={28} weight="800" style={{ marginTop: 48 }}>Account</T>
      <Row>
        <T style={{ flex: 1 }}>{session?.user.name}</T>
        <T tone="muted" size={13}>{session?.user.email}</T>
      </Row>
      <Button title="Datenschutz" variant="ghost" onPress={() => router.push("/privacy")} />
      <Button title="Support" variant="ghost" onPress={() => router.push("/support")} />

      <Heading title="Account löschen" />
      <T tone="muted" size={13}>
        Dein Login und deine Profildaten werden gelöscht. Deine Ergebnisse bleiben in den Gruppen als Gast unter deinem Namen erhalten.
      </T>
      {confirming ? (
        <>
          <Field label="Passwort zur Bestätigung" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
          {error && <Notice>{error}</Notice>}
          <Button title="Endgültig löschen" onPress={remove} loading={busy} disabled={!password} />
        </>
      ) : (
        <Button title="Account löschen" variant="ghost" onPress={() => setConfirming(true)} />
      )}
    </Screen>
  );
}
