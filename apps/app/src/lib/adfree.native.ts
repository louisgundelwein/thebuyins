import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect, useSyncExternalStore } from "react";
import { AppState, Platform } from "react-native";
import type { Purchase } from "expo-iap";
// Type-only: tsc resolves "./adfree" to the web file, whose types this module must match.
import type * as web from "./adfree";

/** One-time (non-consumable) product, same id in App Store Connect and Play Console. */
const SKU = "com.thebuyins.app.adfree";

// Expo Go has no store module.
const storeAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type Store = typeof import("expo-iap");
type Snapshot = { entitlement: web.AdFreeState; price: web.PriceState };

let snapshot: Snapshot = {
  entitlement: storeAvailable ? { status: "loading" } : { status: "unavailable" },
  price: { status: "loading" },
};
const listeners = new Set<() => void>();

/** Within one launch, "owned" is final: a slower, older store read must not undo a purchase. */
function update(patch: Partial<Snapshot>) {
  if (patch.entitlement && snapshot.entitlement.status === "owned") delete patch.entitlement;
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
    // Listeners first: the store can deliver events as soon as it connects.
    store.purchaseUpdatedListener((purchase) => void onPurchase(store, purchase));
    store.purchaseErrorListener((error) => void onPurchaseError(store, error));
    await store.initConnection();
    return store;
  })().catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

/** The running buy() call, settled by the store's purchase events. */
let waiting: {
  promise: Promise<web.BuyResult>;
  resolve: (result: web.BuyResult) => void;
  reject: (error: unknown) => void;
} | undefined;

function settle(outcome: { result: web.BuyResult } | { error: unknown }) {
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
  // Paid: ad-free turns on before the store confirmation, so no ad can slip in meanwhile.
  update({ entitlement: { status: "owned" } });
  await finish(store, purchase);
  settle({ result: "purchased" });
}

const errorCode = (error: unknown) => (typeof error === "object" && error !== null && "code" in error ? error.code : undefined);

/** Cancels and pending payments are normal purchase outcomes, not failures. */
function expectedOutcome(store: Store, error: unknown): web.BuyResult | undefined {
  if (store.isUserCancelledError(error)) return "cancelled";
  const code = errorCode(error);
  if (code === store.ErrorCode.Pending || code === store.ErrorCode.DeferredPayment) return "pending";
  return undefined;
}

/**
 * Settles the running purchase from a store error. iOS reports one error both as an event and
 * as a rejected requestPurchase(), so the second copy finds nothing running; it is only logged
 * when it is a real failure.
 */
async function onPurchaseError(store: Store, error: unknown) {
  const outcome = expectedOutcome(store, error);
  if (!waiting) {
    if (!outcome) console.error("Ad-free: store error outside a purchase", error);
    return;
  }
  if (outcome) return settle({ result: outcome });
  const code = errorCode(error);
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

/**
 * Reads ownership from the store's existing purchases, then finishes any that are still open.
 * A failed read sets ownership to unknown (no ads) and throws. A failure while finishing is
 * logged and does not hide ownership; the next refresh retries.
 */
async function refresh(store: Store): Promise<boolean> {
  let purchases: Purchase[];
  try {
    purchases = (await store.getAvailablePurchases()).filter(isAdFree);
  } catch (error) {
    update({ entitlement: { status: "unknown", error: message(error) } });
    throw error;
  }
  const owned = purchases.length > 0;
  update({ entitlement: { status: owned ? "owned" : "not-owned" } });
  try {
    const open = Platform.OS === "ios"
      ? (await store.getPendingTransactionsIOS()).filter(isAdFree)
      : purchases.filter((purchase) => !("isAcknowledgedAndroid" in purchase && purchase.isAcknowledgedAndroid));
    await Promise.all(open.map((purchase) => finish(store, purchase)));
  } catch (error) {
    console.error("Ad-free: open purchases not checked, retrying next launch", error);
  }
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
 * Loads ownership (and starts loading the price) once per launch. Owner rule (assumption approved by the owner): when
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
    // The price loads in the background so the ads decision does not wait for it.
    void loadPrice(store).catch((error: unknown) => {
      console.error("Ad-free: price unavailable", error);
      update({ price: { status: "failed", error: message(error) } });
    });
    await refresh(store).catch((error: unknown) => console.error("Ad-free: ownership unknown, ads stay off", error));
    // Payments that complete while the app is in the background, or purchases from another
    // device, are picked up when the app comes back.
    AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      refresh(store).catch((error: unknown) => console.error("Ad-free: ownership unknown, ads stay off", error));
    });
  })();
  return loaded;
}

/** Starts a purchase. A second call while one runs (e.g. a double tap) joins the running one. */
async function buy(): Promise<web.BuyResult> {
  const store = await connect();
  if (snapshot.price.status !== "ready") await loadPrice(store);
  if (waiting) return waiting.promise;
  let resolve!: (result: web.BuyResult) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<web.BuyResult>((res, rej) => { resolve = res; reject = rej; });
  waiting = { promise, resolve, reject };
  // The store reports each error both as an event and as this rejection. Whichever comes second
  // finds nothing running; only the event path logs it.
  store.requestPurchase({ type: "in-app", request: { apple: { sku: SKU }, google: { skus: [SKU] } } })
    .catch((error: unknown) => { if (waiting?.promise === promise) void onPurchaseError(store, error); });
  return promise;
}

async function restore(): Promise<web.RestoreResult> {
  const store = await connect();
  try {
    await store.restorePurchases();
  } catch (error) {
    if (store.isUserCancelledError(error)) return "cancelled";
    throw error;
  }
  return (await refresh(store)) ? "found" : "none";
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
