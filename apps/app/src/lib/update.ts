import { isOutdated } from "@thebuyins/core";
import Constants from "expo-constants";
import { useEffect } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import { api } from "./api";
import { useLanguage } from "./language";

const storeUrl = Platform.select({
  ios: "itms-apps://apps.apple.com/app/id6822065827",
  android: "market://details?id=com.thebuyins.app",
});

/**
 * Blocks the app with a native alert while the server's MIN_APP_VERSION is ahead of this build
 * (major.minor only). Checks on launch and on every return to the foreground, so the alert comes
 * back after a trip to the store without updating. Web always serves the latest build.
 */
export function useForceUpdate() {
  const { t } = useLanguage();

  useEffect(() => {
    if (!storeUrl) return;
    let showing = false;
    const check = async () => {
      if (showing) return;
      // Offline or server down means no gate; the app shows its own errors then.
      const res = await api.version.$get().catch(() => null);
      if (!res?.ok) return;
      // An older server answers unknown /api paths with the SPA shell, so parsing can fail too.
      const body = await res.json().catch(() => null);
      if (!body) return;
      const { minAppVersion } = body;
      if (!isOutdated(Constants.expoConfig?.version, minAppVersion)) return;
      showing = true;
      Alert.alert(
        t.update.title,
        t.update.text,
        [
          {
            text: t.update.action,
            onPress: () => {
              showing = false;
              // Opening the store backgrounds the app; returning re-runs the check.
              Linking.openURL(storeUrl).catch(check);
            },
          },
        ],
        { cancelable: false },
      );
    };
    void check();
    const sub = AppState.addEventListener(
      "change",
      (state) => state === "active" && void check(),
    );
    return () => sub.remove();
  }, [t]);
}
