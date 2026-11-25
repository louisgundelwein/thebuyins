import { router } from "expo-router";
import { useState } from "react";
import { ActionRow, Button, Field, Heading, Notice, PAGE_TOP, Row, Screen, Skeleton, T } from "@/components/ui";
import { CurrencyPicker, CurrencyPreferenceStatus } from "@/components/currency-picker";
import { useDefaultCurrency } from "@/lib/default-currency";
import { CheckIcon } from "@/components/icons";
import { authErrorMessage } from "@/components/auth-form";
import { useAdFree } from "@/lib/adfree";
import { useTheme } from "@/lib/appearance";
import { authClient } from "@/lib/auth";
import { useLanguage } from "@/lib/language";
import { useAdPrivacyOptions } from "@/lib/session-ad";

type Purchase = "idle" | "busy" | "pending" | "failed";
type Restore = "idle" | "busy" | "found" | "none" | "failed";

/** Account details, the ad-free purchase and self-service deletion (required by App Store and Google Play). */
export default function Account() {
  const { t } = useLanguage();
  const { preference, save } = useDefaultCurrency();
  const { c } = useTheme();
  const { data: session } = authClient.useSession();
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adPrivacyOptions = useAdPrivacyOptions();
  const adFree = useAdFree();
  const [purchase, setPurchase] = useState<Purchase>("idle");
  const [restore, setRestore] = useState<Restore>("idle");
  const [adPrivacyError, setAdPrivacyError] = useState(false);

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await authClient.deleteUser({ password });
    setBusy(false);
    if (res.error) setError(authErrorMessage(res.error, t));
  }

  async function buyAdFree() {
    setPurchase("busy");
    try {
      const result = await adFree.buy();
      setPurchase(result === "pending" ? "pending" : "idle");
    } catch (e) {
      console.error("Ad-free purchase failed", e);
      setPurchase("failed");
    }
  }

  async function openAdPrivacy(open: () => Promise<void>) {
    setAdPrivacyError(false);
    try {
      await open();
    } catch (e) {
      console.error("Ad privacy options failed", e);
      setAdPrivacyError(true);
    }
  }

  async function restorePurchases() {
    setRestore("busy");
    try {
      const result = await adFree.restore();
      setRestore(result === "cancelled" ? "idle" : result);
    } catch (e) {
      console.error("Restore failed", e);
      setRestore("failed");
    }
  }

  const owned = adFree.entitlement.status === "owned";
  // Details are logged where they happen. Hidden while a purchase starts, so a retry visibly does something.
  const storeFailed = !owned && purchase !== "busy"
    && (purchase === "failed" || adFree.entitlement.status === "unknown" || adFree.price.status === "failed");

  return (
    <Screen>
      <T size={28} weight="800" style={{ marginTop: PAGE_TOP }}>{t.account.title}</T>
      <Row>
        <T style={{ flex: 1 }}>{session?.user.name}</T>
        <T tone="muted" size={13}>{session?.user.email}</T>
      </Row>
      {preference.data ? (
        <CurrencyPicker
          title={t.currency.defaultTitle}
          hint={t.currency.defaultHint}
          value={preference.data}
          onChange={save.mutate}
          saving={save.isPending}
          error={save.isError}
        />
      ) : <CurrencyPreferenceStatus error={preference.isError} retry={() => void preference.refetch()} />}
      <Button title={t.account.privacy} variant="ghost" onPress={() => router.push("/privacy")} />
      {adPrivacyOptions && !owned && (
        <>
          <Button title={t.account.adPrivacy} variant="ghost" onPress={() => void openAdPrivacy(adPrivacyOptions)} />
          {adPrivacyError && <Notice>{t.account.adPrivacyError}</Notice>}
        </>
      )}
      <Button title={t.account.support} variant="ghost" onPress={() => router.push("/support")} />

      {adFree.entitlement.status !== "unavailable" && (
        <>
          {owned ? (
            <ActionRow title={t.account.adFreeActive} icon={<CheckIcon color={c.pos} />} />
          ) : (
            <ActionRow
              title={t.account.adFree}
              subtitle={t.account.adFreeText}
              trailing={adFree.price.status === "ready" ? <T weight="600">{adFree.price.price}</T> : adFree.price.status === "loading" ? <Skeleton /> : null}
              onPress={() => void buyAdFree()}
              loading={purchase === "busy"}
            />
          )}
          {purchase === "pending" && !owned && <T tone="muted" size={13}>{t.account.adFreePending}</T>}
          {storeFailed && <Notice>{t.account.storeError}</Notice>}
          <Button title={t.account.restore} variant="ghost" onPress={() => void restorePurchases()} loading={restore === "busy"} />
          {restore === "found" && <T tone="muted" size={13}>{t.account.restored}</T>}
          {restore === "none" && <T tone="muted" size={13}>{t.account.nothingToRestore}</T>}
          {restore === "failed" && <Notice>{t.account.storeError}</Notice>}
        </>
      )}

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
