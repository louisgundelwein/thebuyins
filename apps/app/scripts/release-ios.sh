#!/usr/bin/env bash
# Local App Store build: prebuild, archive, export, upload to App Store Connect.
# Bump expo.ios.buildNumber in app.json before each upload. Pass --no-upload to stop after export.
# Needs AuthKey_$ASC_KEY_ID.p8 in ~/.appstoreconnect/private_keys (kept out of git).
set -euo pipefail
cd "$(dirname "$0")/.."

ASC_KEY_ID="${ASC_KEY_ID:-83P3B2N559}"
ASC_ISSUER="${ASC_ISSUER:-a76f12c8-1de8-4ada-b55e-07341fa48eeb}"
KEY="$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8"
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
