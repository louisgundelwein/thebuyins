import { Hono } from "hono";

const APPLE_APP_ID = "JR5GVNGJD8.com.thebuyins.app";
const ANDROID_PACKAGE = "com.thebuyins.app";
const APP_ADS_TXT = "google.com, pub-6105108199502947, DIRECT, f08c47fec0942fa0";

// Signing certificate fingerprints (public, safe to commit): Play App Signing key for Play installs,
// upload key from ~/.thebuyins/android-upload.keystore for locally installed release builds.
const CERT_SHA256 = [
  "CE:F0:A1:71:69:A4:F7:28:F8:52:E0:52:A9:61:E7:8D:BD:7E:2E:81:3E:63:FA:F5:3B:02:23:64:1D:A4:7E:5F",
  "3A:79:16:1E:82:12:66:7E:BC:8D:31:4B:5B:A7:41:F6:D2:F5:23:3D:BA:2F:6B:EA:C6:D1:E6:E8:67:31:AE:F1",
];

/**
 * Files fetched directly from https://thebuyins.com by the OS or Google: domain association for
 * iOS Universal Links and Android App Links, and app-ads.txt for AdMob. They must be mounted before
 * the SPA fallback and must not redirect.
 */
export const wellKnownRoutes = new Hono()
  // Authorizes Google AdMob to sell ads in the app (IAB app-ads.txt), read from the developer website root.
  .get("/app-ads.txt", (c) => c.text(`${APP_ADS_TXT}\n`))
  .get("/.well-known/apple-app-site-association", (c) =>
    c.json({
      applinks: {
        details: [{ appIDs: [APPLE_APP_ID], components: [{ "/": "/join*" }] }],
      },
    }),
  )
  .get("/.well-known/assetlinks.json", (c) =>
    c.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE,
          sha256_cert_fingerprints: CERT_SHA256,
        },
      },
    ]),
  );
