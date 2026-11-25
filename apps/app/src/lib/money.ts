import { maxMinorAmount, type Currency } from "@thebuyins/core";

/** Number of stored minor units per displayed unit. Yen has no fractional unit. */
export const minorUnitFactor = (currency: Currency) => currency === "JPY" ? 1 : 100;

/** Formats minor units with the language's separators and the supplied currency. */
export const formatMoney = (cents: number, locale: string, currency: Currency) =>
  new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: currency === "JPY" ? 0 : 2, minimumFractionDigits: 0 }).format(cents / minorUnitFactor(currency));

/** Formats a result with an explicit positive or negative sign. */
export const formatSignedMoney = (cents: number, locale: string, currency: Currency) =>
  (cents > 0 ? "+" : cents < 0 ? "−" : "") + formatMoney(Math.abs(cents), locale, currency);

/** Editable major-unit text without grouping or a currency symbol. */
export function majorAmountText(cents: number, currency: Currency): string {
  if (!Number.isSafeInteger(cents)) throw new Error("Amount exceeds safe integer range");
  if (currency === "JPY") return String(cents);
  const sign = cents < 0 ? "-" : "";
  const digits = String(Math.abs(cents)).padStart(3, "0");
  return `${sign}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

/** Parses nonnegative decimal input exactly; rejects excess precision and unsafe amounts. */
export function parseCents(input: string, currency: Currency): number | null {
  const normalized = input.trim().replace(",", ".");
  const precision = currency === "JPY" ? 0 : 2;
  if (!(precision === 0 ? /^\d+$/ : /^\d+(\.\d{0,2})?$/).test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const minor = Number(whole + fraction.padEnd(precision, "0"));
  return Number.isSafeInteger(minor) && minor <= maxMinorAmount ? minor : null;
}
