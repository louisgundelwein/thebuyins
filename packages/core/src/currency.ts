/** Currencies supported by a poker group. Amounts use the currency's minor unit. */
export const currencies = ["EUR", "USD", "GBP", "CAD", "AUD", "CHF", "JPY", "CNY", "INR", "MXN"] as const;

export type Currency = (typeof currencies)[number];

/** Largest amount that fits in a stored integer. */
export const maxMinorAmount = 2_147_483_647;
