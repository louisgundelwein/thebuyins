import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import type { Purchase } from "expo-iap";
import type * as web from "./adfree";
import type { AdFreeState, BuyResult, PriceState } from "./adfree";

/** One-time (non-consumable) product, same id in App Store Connect and Play Console. */
const SKU = "com.thebuyins.app.adfree";

// Expo Go has no store module.
const storeAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type Store = typeof import("expo-iap");
type Snapshot = { entitlement: AdFreeState; price: PriceState };

let snapshot: Snapshot = {
  entitlement: storeAvailable ? { status: "loading" } : { status: "unavailable" },
  price: { status: "loading" },
};
const listeners = new Set<() => void>();

function update(patch: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

let connection: Promise<Store> | undefined;

/**
 * Connects to the store once per launch and listens for purchases from then on, so iOS
 * transactions replayed at launch and Android payments that complete later are finished too.
 */
function connect(): Promise<Store> {
  connection ??= (async () => {
    const store = await import("expo-iap");
    await store.initConnection();
    store.purchaseUpdatedListener((purchase) => void onPurchase(store, purchase));
    store.purchaseErrorListener((error) => void onPurchaseError(store, error));
    return store;
  })().catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

/** The running buy() call, settled by the store's purchase events. */
let waiting: { resolve: (result: BuyResult) => void; reject: (error: unknown) => void } | undefined;

function settle(outcome: { result: BuyResult } | { error: unknown }) {
  const current = waiting;
  waiting = undefined;
  if (!current) return;
  if ("result" in outcome) current.resolve(outcome.result);
  else current.reject(outcome.error);
}

const isAdFree = (purchase: Purchase) => purchase.productId === SKU && purchase.purchaseState === "purchased";

/**
 * Finishes (iOS) or acknowledges (Android) a purchase so the store does not refund it.
 * A failure is logged, not thrown: the user paid, so ad-free stays on, and the next launch retries.
 */
async function finish(store: Store, purchase: Purchase) {
  try {
    await store.finishTransaction({ purchase, isConsumable: false });
  } catch (error) {
    console.error("Ad-free purchase not finished, retrying next launch", error);
  }
}

async function onPurchase(store: Store, purchase: Purchase) {
  if (purchase.productId !== SKU) return;
  if (purchase.purchaseState === "pending") {
    // Not paid yet: grant nothing, finish nothing. The store delivers it again once paid.
    settle({ result: "pending" });
    return;
  }
  if (purchase.purchaseState !== "purchased") {
    console.error("Ad-free purchase in unexpected state", purchase.purchaseState);
    settle({ error: new Error(`Purchase state: ${purchase.purchaseState}`) });
    return;
  }
  await finish(store, purchase);
  update({ entitlement: { status: "owned" } });
  settle({ result: "purchased" });
}

async function onPurchaseError(store: Store, error: unknown) {
  if (!waiting) return;
  if (store.isUserCancelledError(error)) return settle({ result: "cancelled" });
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (code === store.ErrorCode.Pending || code === store.ErrorCode.DeferredPayment) return settle({ result: "pending" });
  if (code === store.ErrorCode.AlreadyOwned) {
    // Happens when the launch query failed for an owner. Read ownership again instead of erroring.
    try {
      settle(await refresh(store) ? { result: "purchased" } : { error });
    } catch (refreshError) {
      settle({ error: refreshError });
    }
    return;
  }
  settle({ error });
}

/** Reads ownership from the store's existing purchases and finishes any that are still open. */
async function refresh(store: Store): Promise<boolean> {
  const purchases = (await store.getAvailablePurchases()).filter(isAdFree);
  const open = Platform.OS === "ios"
    ? (await store.getPendingTransactionsIOS()).filter(isAdFree)
    : purchases.filter((purchase) => !("isAcknowledgedAndroid" in purchase && purchase.isAcknowledgedAndroid));
  await Promise.all(open.map((purchase) => finish(store, purchase)));
  const owned = purchases.length > 0;
  update({ entitlement: { status: owned ? "owned" : "not-owned" } });
  return owned;
}

/** Loads the localized price. Throws when the store does not know the product. */
async function loadPrice(store: Store): Promise<string> {
  const products = await store.fetchProducts({ skus: [SKU], type: "in-app" });
  const product = products?.find((item) => item.id === SKU);
  if (!product) throw new Error(`The store has no product ${SKU}`);
  update({ price: { status: "ready", price: product.displayPrice } });
  return product.displayPrice;
}

let loaded: Promise<void> | undefined;

/**
 * Loads ownership and price once per launch. Owner rule (assumption approved by the owner): when
 * ownership cannot be read we do not know, so no ad is shown, because a paying user must never
 * see one. The error is logged and shown on Account; non-owners just get no ad that time.
 */
function load(): Promise<void> {
  if (!storeAvailable) return Promise.resolve();
  loaded ??= (async () => {
    let store: Store;
    try {
      store = await connect();
    } catch (error) {
      console.error("Ad-free: store connection failed, ads stay off", error);
      update({ entitlement: { status: "unknown", error: message(error) }, price: { status: "failed", error: message(error) } });
      return;
    }
    const price = loadPrice(store).catch((error: unknown) => {
      console.error("Ad-free: price unavailable", error);
      update({ price: { status: "failed", error: message(error) } });
    });
    await refresh(store).catch((error: unknown) => {
      console.error("Ad-free: ownership unknown, ads stay off", error);
      update({ entitlement: { status: "unknown", error: message(error) } });
    });
    await price;
  })();
  return loaded;
}

async function buy(): Promise<BuyResult> {
  const store = await connect();
  if (snapshot.price.status !== "ready") await loadPrice(store);
  if (waiting) throw new Error("A purchase is already running");
  const result = new Promise<BuyResult>((resolve, reject) => { waiting = { resolve, reject }; });
  store.requestPurchase({ type: "in-app", request: { apple: { sku: SKU }, google: { skus: [SKU] } } })
    .catch((error: unknown) => onPurchaseError(store, error));
  return result;
}

async function restore(): Promise<boolean> {
  const store = await connect();
  await store.restorePurchases();
  return refresh(store);
}

/** Ad-free state for the Account screen; starts loading on first use. */
export const useAdFree: typeof web.useAdFree = () => {
  useEffect(() => { void load(); }, []);
  const state = useSyncExternalStore(subscribe, () => snapshot);
  return { ...state, buy, restore };
};

/** Whether ads may be shown: only when the store confirmed the user does not own ad-free. */
export const adsAllowed: typeof web.adsAllowed = async () => {
  await load();
  return snapshot.entitlement.status === "not-owned";
};
