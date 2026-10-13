// iOS 27 kills apps at launch that don't adopt the UIScene life cycle. Expo ships
// ExpoAppSceneDelegate for this, but the SDK 57 prebuild template still starts React Native
// from the AppDelegate. This plugin hands window creation to the scene delegate.
// ponytail: string patch of the generated AppDelegate; drop once the Expo template adopts scenes.
const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const windowBlock = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

module.exports = (config) => {
  config = withAppDelegate(config, (c) => {
    let src = c.modResults.contents;
    if (src.includes("ExpoReactNativeFactoryProvider")) return c;
    if (!windowBlock.test(src)) throw new Error("with-scene-lifecycle: AppDelegate template changed, update the plugin");
    src = src
      .replace("class AppDelegate: ExpoAppDelegate {", "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {")
      .replace(windowBlock, "\n");
    c.modResults.contents = src;
    return c;
  });

  return withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: "Default Configuration", UISceneDelegateClassName: "EXExpoAppSceneDelegate" },
        ],
      },
    };
    return c;
  });
};
