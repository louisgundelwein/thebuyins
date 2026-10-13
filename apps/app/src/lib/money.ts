/** Formats in a locale tag: 2050 → "20,50 €" (de-DE) or "€20.50" (en-US), 2000 → "20 €" / "€20". Components use `useLanguage().money`. */
export const formatMoney = (cents: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(cents / 100);

/** Like `formatMoney` but always signed, for results: "+12 €", "−3,50 €". */
export const formatSignedMoney = (cents: number, locale: string) =>
  (cents > 0 ? "+" : cents < 0 ? "−" : "") + formatMoney(Math.abs(cents), locale);

/** Parses user input like "20", "20,5" or "20.50" into cents. Returns null for invalid input. */
export function parseCents(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
