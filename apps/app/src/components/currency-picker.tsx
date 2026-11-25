import { currencies, type Currency } from "@thebuyins/core";
import { useState } from "react";
import { ActionRow, Button, Notice, Skeleton, T } from "@/components/ui";
import { useLanguage } from "@/lib/language";

/** An expandable choice used by Account and the new-group form. */
export function CurrencyPicker({ title, hint, value, onChange, saving, error }: {
  title: string;
  hint?: string;
  value: Currency;
  onChange: (currency: Currency) => void;
  saving?: boolean;
  error?: boolean;
}) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const names = new Intl.DisplayNames(locale, { type: "currency" });
  return (
    <>
      <ActionRow title={title} subtitle={hint} trailing={<T>{value}</T>} loading={saving} onPress={() => setOpen(!open)} />
      {open && !saving && currencies.map((code) => (
        <Button
          key={code}
          title={`${code} · ${names.of(code)}`}
          selected={code === value}
          variant={code === value ? "soft" : "ghost"}
          onPress={() => {
            setOpen(false);
            if (code !== value) onChange(code);
          }}
        />
      ))}
      {error && <Notice>{t.currency.saveError}</Notice>}
    </>
  );
}

/** Gives storage reads the same pending and retry treatment in both entry points. */
export function CurrencyPreferenceStatus({ error, retry }: { error: boolean; retry: () => void }) {
  const { t } = useLanguage();
  return error
    ? <><Notice>{t.currency.loadError}</Notice><Button title={t.currency.retry} variant="ghost" onPress={retry} /></>
    : <Skeleton />;
}
