import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { InterstitialAd } from "react-native-google-mobile-ads";

/** Prepare a test ad during setup. Only an explicit start can present it. */
export function useSessionAd() {
  const present = useRef<() => Promise<void>>(undefined);

  useEffect(() => {
    if (!Constants.expoConfig?.extra?.testSessionAds ||
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
    let cancelled = false;
    let ad: InterstitialAd | undefined;

    async function prepare() {
      const { default: mobileAds, AdsConsent, AdsConsentStatus, AdEventType, InterstitialAd, TestIds } =
        await import("react-native-google-mobile-ads");
      const info = await AdsConsent.requestInfoUpdate();
      if (cancelled || !info.canRequestAds) return;
      if (info.status !== AdsConsentStatus.NOT_REQUIRED) {
        if (info.status !== AdsConsentStatus.OBTAINED ||
            !(await AdsConsent.getUserChoices()).storeAndAccessInformationOnDevice) return;
      }
      await mobileAds().initialize();
      if (cancelled) return;
      const slot = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, { requestNonPersonalizedAdsOnly: true });
      ad = slot;
      slot.addAdEventListener(AdEventType.LOADED, () => {
        present.current = () => new Promise<void>((resolve, reject) => {
          const close = slot.addAdEventListener(AdEventType.CLOSED, () => { cleanup(); resolve(); });
          const fail = slot.addAdEventListener(AdEventType.ERROR, error => { cleanup(); reject(error); });
          function cleanup() { close(); fail(); }
          slot.show().catch(error => { cleanup(); reject(error); });
        });
      });
      slot.addAdEventListener(AdEventType.ERROR, () => { present.current = undefined; });
      slot.load();
    }

    void prepare().catch(error => console.warn("Session ad unavailable", error));
    return () => {
      cancelled = true;
      present.current = undefined;
      ad?.destroy();
    };
  }, []);

  return async () => {
    const show = present.current;
    present.current = undefined;
    if (AppState.currentState !== "active") return;
    try { await show?.(); }
    catch (error) { console.warn("Session ad presentation failed", error); }
  };
}
