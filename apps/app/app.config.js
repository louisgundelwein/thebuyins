// AdMob IDs for The Buy-Ins (publisher pub-6105108199502947). Development builds use Google's test ad units.
const ADMOB_IOS_APP_ID = "ca-app-pub-6105108199502947~9647740282";
const ADMOB_ANDROID_APP_ID = "ca-app-pub-6105108199502947~4136840411";
const ADMOB_IOS_INTERSTITIAL_ID = "ca-app-pub-6105108199502947/6790923916";
const ADMOB_ANDROID_INTERSTITIAL_ID = "ca-app-pub-6105108199502947/9225515563";

// Ad networks Google lists for AdMob in the iOS quick start (developers.google.com/admob/ios/quick-start).
const SK_AD_NETWORK_ITEMS = [
  "cstr6suwn9", "4fzdc2evr5", "2fnua5tdw4", "ydx93a7ass", "p78axxw29g", "v72qych5uu", "ludvb6z3bs",
  "cp8zw746q7", "3sh42y64q3", "c6k4g5qg8m", "s39g8k73mm", "wg4vff78zm", "3qy4746246", "f38h382jlk",
  "hs6bdukanm", "mlmmfzh3r3", "v4nxqhlyqp", "wzmmz9fp6w", "su67r6k2v3", "yclnxrl5pm", "t38b2kh725",
  "7ug5zh24hu", "gta9lk7p23", "vutu7akeur", "y5ghdn5j9k", "v9wttpbfk9", "n38lu8286q", "47vhws6wlr",
  "kbd757ywx3", "9t245vhmpl", "a2p9lx4jpn", "22mmun2rn5", "44jx6755aq", "k674qkevps", "4468km3ulz",
  "2u9pt9hc89", "8s468mfl3y", "klf5c3l5u5", "ppxm28t8ap", "kbmxgpxpgc", "uw77j35x4d", "578prtvx9j",
  "4dzt52r2t5", "tl55sbb4fm", "c3frkrj4fj", "e5fvkxwrpn", "8c4e2ghe7u", "3rd42ekr43", "97r2b46745",
  "3qcr597p9d",
].map((id) => `${id}.skadnetwork`);

/**
 * Adds Google Mobile Ads and in-app purchases (expo-iap, Google Play on Android) to native builds. The app reads the interstitial unit IDs from `extra`
 * and uses Google's test units in __DEV__.
 */
module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      adUnits: { ios: ADMOB_IOS_INTERSTITIAL_ID, android: ADMOB_ANDROID_INTERSTITIAL_ID },
    },
    plugins: [...config.plugins, ["react-native-google-mobile-ads", {
      iosAppId: ADMOB_IOS_APP_ID,
      androidAppId: ADMOB_ANDROID_APP_ID,
      delayAppMeasurementInit: true,
      userTrackingUsageDescription:
        "Your choice decides whether the ads shown before a round can be tailored to you. The app works the same either way.",
      skAdNetworkItems: SK_AD_NETWORK_ITEMS,
    }], ["expo-iap", { android: { store: "play" } }]],
  };
};
