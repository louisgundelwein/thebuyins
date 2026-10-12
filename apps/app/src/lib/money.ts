const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** 2050 → "20,50 €", 2000 → "20 €". */
export const money = (cents: number) => eur.format(cents / 100);

/** Like `money` but always signed, for results: "+12 €", "−3,50 €". */
export const signedMoney = (cents: number) => (cents > 0 ? "+" : cents < 0 ? "−" : "") + money(Math.abs(cents));

/** Parses user input like "20", "20,5" or "20.50" into cents. Returns null for invalid input. */
export function parseCents(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}
