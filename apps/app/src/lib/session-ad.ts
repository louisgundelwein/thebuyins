// Web has no ads. Metro selects session-ad.native.ts on mobile.

/** Asks for ad consent at app start on mobile. */
export function useAdConsent() {}

/** Opens the ad privacy options on mobile when required. */
export function useAdPrivacyOptions(): (() => Promise<void>) | undefined {
  return undefined;
}

/** Web starts sessions directly. */
export function useSessionAd(): () => Promise<void> {
  return async () => {};
}
