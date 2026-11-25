#!/usr/bin/env bash
# Local App Store build: prebuild, archive, export, upload to App Store Connect.
# Bump expo.ios.buildNumber in app.json before each upload. Pass --no-upload to stop after export.
# Reads ASC_KEY_ID, ASC_ISSUER, ASC_KEY_PATH from apps/app/.env (gitignored).
# altool finds the key by ID in ~/.appstoreconnect/private_keys.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
KEY="$ASC_KEY_PATH"
AUTH=(-allowProvisioningUpdates -authenticationKeyPath "$KEY" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER")
OUT=build/ios
[[ -f "$KEY" ]] || { echo "missing $KEY" >&2; exit 1; }

CI=1 npx expo prebuild --clean -p ios
rm -rf "$OUT" && mkdir -p "$OUT"

xcodebuild archive -workspace ios/TheBuyIns.xcworkspace -scheme TheBuyIns -configuration Release \
  -destination generic/platform=iOS -archivePath "$OUT/TheBuyIns.xcarchive" "${AUTH[@]}" | tail -n 5

cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>signingStyle</key><string>automatic</string>
  <key>destination</key><string>export</string>
</dict></plist>
PLIST

xcodebuild -exportArchive -archivePath "$OUT/TheBuyIns.xcarchive" -exportPath "$OUT/export" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" "${AUTH[@]}" | tail -n 5

[[ "${1:-}" == "--no-upload" ]] && { echo "exported $OUT/export"; exit 0; }
xcrun altool --upload-app --type ios --file "$OUT"/export/*.ipa --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER"
