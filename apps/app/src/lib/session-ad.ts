/** Web starts sessions directly. Metro selects the native hook on mobile. */
export function useSessionAd(): () => Promise<void> {
  return async () => {};
}
