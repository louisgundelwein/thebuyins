import type { Currency } from "@thebuyins/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import { Button, Field, Notice, PAGE_TOP, Screen, T } from "@/components/ui";
import { CurrencyPicker, CurrencyPreferenceStatus } from "@/components/currency-picker";
import { useDefaultCurrency } from "@/lib/default-currency";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { parseCents } from "@/lib/money";
import { keys } from "@/lib/queries";

export default function NewGroup() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [buyIn, setBuyIn] = useState("20");
  const qc = useQueryClient();
  const { preference } = useDefaultCurrency();
  const [pickedCurrency, setCurrency] = useState<Currency>();
  const currency = pickedCurrency ?? preference.data;
  const cents = currency ? parseCents(buyIn, currency) : null;

  const create = useMutation({
    mutationFn: (values: { defaultBuyInCents: number; currency: Currency }) => parseResponse(api.groups.$post({ json: { name, ...values } })),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.groups });
      router.back();
    },
  });

  return (
    <Screen footer={<Button title={t.group.create} disabled={!name.trim() || !cents} loading={create.isPending} onPress={() => { if (cents && currency) create.mutate({ defaultBuyInCents: cents, currency }); }} />}>
      <T size={28} weight="800" style={{ marginTop: PAGE_TOP }}>{t.group.title}</T>
      <Field label={t.group.name} value={name} onChangeText={setName} placeholder={t.group.namePlaceholder} autoFocus />
      {currency ? (
        <>
          <CurrencyPicker title={t.currency.title} value={currency} onChange={setCurrency} />
          <Field label={t.group.defaultBuyIn(currency)} value={buyIn} onChangeText={setBuyIn} keyboardType={currency === "JPY" ? "number-pad" : "decimal-pad"} />
          {buyIn.trim() !== "" && cents === null && <Notice>{t.settle.invalidAmount(currency)}</Notice>}
        </>
      ) : <CurrencyPreferenceStatus error={preference.isError} retry={() => void preference.refetch()} />}
      {create.isError && <Notice>{create.error.message}</Notice>}
    </Screen>
  );
}
