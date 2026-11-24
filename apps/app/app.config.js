const adsPackage = "react-native-google-mobile-ads";

/** Configure Google's sample apps only for explicitly enabled native builds. */
module.exports = ({ config }) => {
  if (process.env.BUYINS_TEST_ADS !== "1") return config;
  return {
    ...config,
    extra: { ...config.extra, testSessionAds: true },
    plugins: [...config.plugins, [adsPackage, {
      androidAppId: "ca-app-pub-3940256099942544~3347511713",
      iosAppId: "ca-app-pub-3940256099942544~1458002511",
      delayAppMeasurementInit: true,
    }]],
  };
};
