/** Currencies supported by a poker group. Amounts use the currency's minor unit. */
export const currencies = ["EUR", "USD", "GBP", "CAD", "AUD", "CHF", "JPY", "CNY", "INR", "MXN"] as const;

export type Currency = (typeof currencies)[number];
