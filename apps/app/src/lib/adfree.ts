// Web has no store, so ad-free cannot be bought there. Metro selects adfree.native.ts on mobile.
// The types below are shared: adfree.native.ts is typed against this file.

/** Whether the user owns ad-free. Only "not-owned" lets the ad SDK start. */
export type AdFreeState =
  | { status: "unavailable" }
  | { status: "loading" }
  | { status: "owned" }
  | { status: "not-owned" }
  | { status: "unknown"; error: string };

/** The store's localized price for ad-free. */
export type PriceState =
  | { status: "loading" }
  | { status: "ready"; price: string }
  | { status: "failed"; error: string };

/** "pending" means the store still waits for payment (Ask to Buy, slow payment methods). */
export type BuyResult = "purchased" | "pending" | "cancelled";

/** "cancelled" means the user closed the store's sign-in. */
export type RestoreResult = "found" | "none" | "cancelled";

export type AdFree = {
  entitlement: AdFreeState;
  price: PriceState;
  /** Starts the store purchase. Throws store errors; a user cancel resolves "cancelled". */
  buy: () => Promise<BuyResult>;
  /** Asks the store for earlier purchases. Throws store errors. */
  restore: () => Promise<RestoreResult>;
};

function noStore(): never {
  throw new Error("In-app purchases need the iOS or Android app");
}

/** Ad-free state for the Account screen. Always "unavailable" on web. */
export function useAdFree(): AdFree {
  return { entitlement: { status: "unavailable" }, price: { status: "loading" }, buy: noStore, restore: noStore };
}

/** Whether ads may be shown. Web shows no ads. */
export async function adsAllowed(): Promise<boolean> {
  return false;
}
