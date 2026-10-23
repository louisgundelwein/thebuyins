#!/usr/bin/env bash
# TestFlight build for CI: prebuild, archive, export with cloud-managed signing, upload to App Store Connect.
# Runs from the repo root on a fresh macOS VM. Needs BUILD_NUMBER (integer), ASC_KEY_ID, ASC_ISSUER, ASC_PRIVATE_KEY in the env.
# Pass --no-upload to stop after export. Output goes to ~/ci-testflight. Any failure exits non-zero.
set -euo pipefail

ROOT="$(pwd)"
APP_DIR="$ROOT/apps/app"
TOOLS="$HOME/ci-tools"
OUT="$HOME/ci-testflight"
ARCHIVE="$OUT/TheBuyIns.xcarchive"
EXPORT="$OUT/export"
NODE_VERSION=24.22.1
POD_VERSION=1.17.0
RUBY_DIGEST=43ff285a82f48c84a06d0676a3800815a19d290d32e44182ddd7a6e95478e18e
KEY_DIR="$HOME/.appstoreconnect/private_keys"
KEY="$KEY_DIR/AuthKey_${ASC_KEY_ID:-missing}.p8"

export PATH="$TOOLS/node/bin:$TOOLS/ruby/bin:$TOOLS/gems/bin:$TOOLS/bin:$PATH"
export GEM_HOME="$TOOLS/gems"
export LANG=en_US.UTF-8

phase() { echo "== $1 ($(date +%H:%M:%S))"; SECONDS=0; }
phase_done() { echo "== $1 done in ${SECONDS}s"; }
fail() { echo "$*" >&2; exit 1; }

case "${1:-}" in
  "") UPLOAD=1 ;;
  --no-upload) UPLOAD=0 ;;
  *) fail "unknown argument: $1 (only --no-upload)" ;;
esac
[[ -f "$APP_DIR/app.json" ]] || fail "run from the repo root: $APP_DIR/app.json not found"
[[ "${BUILD_NUMBER:-}" =~ ^[0-9]+$ ]] || fail "BUILD_NUMBER must be an integer, got '${BUILD_NUMBER:-}'"
: "${ASC_KEY_ID:?missing ASC_KEY_ID}" "${ASC_ISSUER:?missing ASC_ISSUER}" "${ASC_PRIVATE_KEY:?missing ASC_PRIVATE_KEY}"

phase "api key"
# Written without echoing it. openssl rejects a key whose newlines were mangled by the CI system.
mkdir -p "$KEY_DIR"
chmod 700 "$HOME/.appstoreconnect" "$KEY_DIR"
(umask 077 && printf '%s\n' "$ASC_PRIVATE_KEY" > "$KEY")
chmod 600 "$KEY"
openssl pkey -in "$KEY" -noout || fail "ASC_PRIVATE_KEY is not a valid PEM key"
phase_done "api key"

phase "toolchain"
rm -rf "$TOOLS" "$OUT"
mkdir -p "$TOOLS" "$OUT"

# Official Node tarball, checked against the published SHA-256 list.
node_pkg="node-v$NODE_VERSION-darwin-arm64.tar.gz"
curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/$node_pkg" -o "$TOOLS/$node_pkg"
curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" -o "$TOOLS/SHASUMS256.txt"
(cd "$TOOLS" && grep " $node_pkg\$" SHASUMS256.txt | shasum -a 256 -c -)
mkdir -p "$TOOLS/node"
tar -xzf "$TOOLS/$node_pkg" -C "$TOOLS/node" --strip-components 1

# Portable Ruby from Homebrew's bottle registry (the guest's system Ruby is too old for CocoaPods).
ghcr_token="$(curl -fsSL "https://ghcr.io/token?service=ghcr.io&scope=repository:homebrew/core/portable-ruby:pull" | sed -E 's/.*"token":"([^"]+)".*/\1/')"
curl -fsSL -H "Authorization: Bearer $ghcr_token" \
  "https://ghcr.io/v2/homebrew/core/portable-ruby/blobs/sha256:$RUBY_DIGEST" -o "$TOOLS/portable-ruby.tar.gz"
echo "$RUBY_DIGEST  $TOOLS/portable-ruby.tar.gz" | shasum -a 256 -c -
mkdir -p "$TOOLS/ruby-unpacked"
tar -xzf "$TOOLS/portable-ruby.tar.gz" -C "$TOOLS/ruby-unpacked"
ruby_bin="$(find "$TOOLS/ruby-unpacked" -path '*/bin/ruby' -type f | head -n 1)"
[[ -x "$ruby_bin" ]] || fail "no ruby binary in the portable-ruby bottle"
mv "$(dirname "$(dirname "$ruby_bin")")" "$TOOLS/ruby"

npm install -g --prefix "$TOOLS" pnpm@11.17.0 >/dev/null
gem install cocoapods -v "$POD_VERSION" --no-document --install-dir "$GEM_HOME" >/dev/null
node --version
pnpm --version
pod --version
phase_done "toolchain"

phase "pnpm install"
pnpm install --frozen-lockfile
phase_done "pnpm install"

phase "expo prebuild"
(cd "$APP_DIR" && CI=1 npx expo prebuild --clean -p ios --no-install)
phase_done "expo prebuild"

phase "pod install"
(cd "$APP_DIR/ios" && pod install)
phase_done "pod install"


AUTH=(-allowProvisioningUpdates -authenticationKeyPath "$KEY" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER")

phase "archive"
rm -rf "$OUT/TheBuyIns.xcarchive"
xcodebuild archive -workspace "$APP_DIR/ios/TheBuyIns.xcworkspace" -scheme TheBuyIns -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" "CURRENT_PROJECT_VERSION=$BUILD_NUMBER" "${AUTH[@]}" \
  >"$OUT/archive.log" 2>&1 || { tail -n 80 "$OUT/archive.log" >&2; fail "archive failed, full log: $OUT/archive.log"; }
archived_app=("$ARCHIVE"/Products/Applications/*.app)
[[ ${#archived_app[@]} -eq 1 ]] || fail "expected one .app in the archive, found ${#archived_app[@]}"
archived_build="$(plutil -extract CFBundleVersion raw "${archived_app[0]}/Info.plist")"
[[ "$archived_build" == "$BUILD_NUMBER" ]] || fail "archive has build $archived_build, expected $BUILD_NUMBER"
phase_done "archive"

phase "export"
cat > "$OUT/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>signingStyle</key><string>automatic</string>
  <key>destination</key><string>export</string>
</dict></plist>
PLIST
rm -rf "$EXPORT"
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$EXPORT" \
  -exportOptionsPlist "$OUT/ExportOptions.plist" "${AUTH[@]}" >"$OUT/export.log" 2>&1 \
  || { tail -n 80 "$OUT/export.log" >&2; fail "export failed, full log: $OUT/export.log"; }
ipas=("$EXPORT"/*.ipa)
[[ ${#ipas[@]} -eq 1 && -f "${ipas[0]}" ]] || fail "expected one .ipa in $EXPORT, found ${#ipas[@]}"
ipa_build="$(unzip -p "${ipas[0]}" 'Payload/*.app/Info.plist' | plutil -extract CFBundleVersion raw -)"
[[ "$ipa_build" == "$BUILD_NUMBER" ]] || fail "ipa has build $ipa_build, expected $BUILD_NUMBER"
phase_done "export"

if [[ "$UPLOAD" -eq 0 ]]; then
  echo "exported ${ipas[0]} (build $ipa_build)"
  exit 0
fi

phase "upload"
xcrun altool --upload-app --type ios --file "${ipas[0]}" --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER"
phase_done "upload"
