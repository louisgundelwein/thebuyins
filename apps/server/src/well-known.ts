import { Hono } from "hono";

const APPLE_APP_ID = "JR5GVNGJD8.com.thebuyins.app";
const ANDROID_PACKAGE = "com.thebuyins.app";

// Upload key fingerprint from ~/.thebuyins/android-upload.keystore (public, safe to commit).
const UPLOAD_KEY_SHA256 = "3A:79:16:1E:82:12:66:7E:BC:8D:31:4B:5B:A7:41:F6:D2:F5:23:3D:BA:2F:6B:EA:C6:D1:E6:E8:67:31:AE:F1";

// Comma-separated extra signing fingerprints. Set ANDROID_CERT_SHA256 to the Play App Signing
// SHA-256 (Play Console > App integrity > App signing) so Play-installed builds verify too.
const extraFingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
  .split(",")
  .map((fingerprint: string) => fingerprint.trim())
  .filter(Boolean);

/**
 * Domain-association files for iOS Universal Links and Android App Links. The OS fetches these
 * directly from https://thebuyins.com/.well-known/, so they must be mounted before the SPA fallback
 * and must not redirect.
 */
export const wellKnownRoutes = new Hono()
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
          sha256_cert_fingerprints: [UPLOAD_KEY_SHA256, ...extraFingerprints],
        },
      },
    ]),
  );
