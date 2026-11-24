// Keep the native SDK out of ordinary builds as well as the Expo plugin.
module.exports = process.env.BUYINS_TEST_ADS === "1" ? {} : {
  dependencies: {
    "react-native-google-mobile-ads": { platforms: { ios: null, android: null } },
  },
};
