import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import type { AdsConsentInfo, InterstitialAd } from "react-native-google-mobile-ads";
import { adsAllowed } from "./adfree";

// Expo Go has no Google Mobile Ads SDK; it skips ads entirely.
const adsAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let consent: Promise<AdsConsentInfo | undefined> | undefined;

/**
 * Asks once per launch for ad consent (Google's GDPR form, then Apple's tracking prompt when configured
 * in AdMob) and starts the SDK if ads may be requested. Shared by app start, the round start and settings.
 * Resolves undefined without asking or starting the SDK when ads are off (ad-free owned or unknown).
 */
function gatherAdConsent(): Promise<AdsConsentInfo | undefined> {
  consent ??= (async () => {
    if (!(await adsAllowed())) return undefined;
    const { default: mobileAds, AdsConsent, MaxAdContentRating } = await import("react-native-google-mobile-ads");
    // iOS ignores the tracking prompt while the app is not yet active.
    await untilActive();
    const info = await AdsConsent.gatherConsent();
    if (info.canRequestAds) {
      await mobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.G });
      await mobileAds().initialize();
    }
    return info;
  })().catch((error: unknown) => {
    consent = undefined;
    throw error;
  });
  return consent;
}

function untilActive() {
  if (AppState.currentState === "active") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      sub.remove();
      resolve();
    });
  });
}

/** Mounted once for signed-in users so consent popups appear at app start, not mid-setup at the table. */
export function useAdConsent() {
  useEffect(() => {
    if (!adsAvailable) return;
    gatherAdConsent().catch((error: unknown) => console.warn("Ad consent unavailable", error));
  }, []);
}

/** Opens Google's privacy options form when the user's region requires one; undefined otherwise. */
export function useAdPrivacyOptions(): (() => Promise<void>) | undefined {
  const [required, setRequired] = useState(false);
  useEffect(() => {
    if (!adsAvailable) return;
    let cancelled = false;
    void (async () => {
      const { AdsConsentPrivacyOptionsRequirementStatus } = await import("react-native-google-mobile-ads");
      const info = await gatherAdConsent();
      if (!cancelled) setRequired(info?.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
    })().catch((error: unknown) => console.warn("Ad privacy options unavailable", error));
    return () => { cancelled = true; };
  }, []);
  if (!required) return undefined;
  // Throws when the form cannot open (e.g. offline) so the caller can tell the user.
  return async () => {
    const { AdsConsent } = await import("react-native-google-mobile-ads");
    await AdsConsent.showPrivacyOptionsForm();
    // The choice may have changed; the next round start gathers consent again.
    consent = undefined;
  };
}

/** Prepare an interstitial during setup. Only an explicit start can present it. */
export function useSessionAd() {
  const present = useRef<() => Promise<void>>(undefined);

  useEffect(() => {
    if (!adsAvailable) return;
    let cancelled = false;
    let ad: InterstitialAd | undefined;

    async function prepare() {
      const { AdEventType, InterstitialAd, TestIds } = await import("react-native-google-mobile-ads");
      const info = await gatherAdConsent();
      if (cancelled || !info?.canRequestAds) return;
      const slot = InterstitialAd.createForAdRequest(__DEV__ ? TestIds.INTERSTITIAL : adUnitId());
      ad = slot;
      slot.addAdEventListener(AdEventType.LOADED, () => {
        present.current = () => new Promise<void>((resolve, reject) => {
          const close = slot.addAdEventListener(AdEventType.CLOSED, () => { cleanup(); resolve(); });
          const fail = slot.addAdEventListener(AdEventType.ERROR, error => { cleanup(); reject(error); });
          function cleanup() { close(); fail(); }
          slot.show().catch(error => { cleanup(); reject(error); });
        });
      });
      slot.addAdEventListener(AdEventType.ERROR, (error) => {
        // The round still starts without an ad; the log says why none was shown.
        console.warn("Session ad failed to load", error);
        present.current = undefined;
      });
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
    if (!show || AppState.currentState !== "active") return;
    // Ad-free may have been bought after the ad was prepared. Ownership is already loaded once an ad exists.
    if (!(await adsAllowed())) return;
    try { await show(); }
    catch (error) { console.warn("Session ad presentation failed", error); }
  };
}

/** The real interstitial unit for this platform, set in app.config.js. */
function adUnitId(): string {
  const unit: unknown = Constants.expoConfig?.extra?.adUnits?.[Platform.OS];
  if (typeof unit !== "string") throw new Error(`No AdMob interstitial unit for ${Platform.OS} in app config`);
  return unit;
}
