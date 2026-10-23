#!/usr/bin/env bash
# iOS smoke test for CI: Release build for the simulator, install, launch, check the app stays up, screenshot.
# Runs from the repo root on a fresh macOS VM. Installs node, pnpm and CocoaPods into ~/ci-tools for each run.
# Output goes to ~/ci-e2e. Any failure exits non-zero.
set -euo pipefail

ROOT="$(pwd)"
APP_DIR="$ROOT/apps/app"
TOOLS="$HOME/ci-tools"
OUT="$HOME/ci-e2e"
DERIVED="$OUT/derived"
SHOT="$OUT/screenshot.png"
BUNDLE_ID=com.thebuyins.app
NODE_VERSION=24.22.1
POD_VERSION=1.17.0
RUBY_DIGEST=43ff285a82f48c84a06d0676a3800815a19d290d32e44182ddd7a6e95478e18e

export PATH="$TOOLS/node/bin:$TOOLS/ruby/bin:$TOOLS/gems/bin:$TOOLS/bin:$PATH"
export GEM_HOME="$TOOLS/gems"
export LANG=en_US.UTF-8

[[ -f "$APP_DIR/app.json" ]] || { echo "run from the repo root: $APP_DIR/app.json not found" >&2; exit 1; }

phase() { echo "== $1 ($(date +%H:%M:%S))"; SECONDS=0; }
phase_done() { echo "== $1 done in ${SECONDS}s"; }

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
[[ -x "$ruby_bin" ]] || { echo "no ruby binary in the portable-ruby bottle" >&2; exit 1; }
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

phase "xcodebuild Release"
# Ad-hoc signing (what Xcode does for simulator builds). CODE_SIGNING_ALLOWED=NO leaves the app without
# entitlements, so keychain calls fail (-34018) and SecureStore never resolves: the app renders a black screen.
xcodebuild -workspace "$APP_DIR/ios/TheBuyIns.xcworkspace" -scheme TheBuyIns -configuration Release \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath "$DERIVED" \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES build >"$OUT/xcodebuild.log" 2>&1 \
  || { tail -n 80 "$OUT/xcodebuild.log" >&2; echo "xcodebuild failed, full log: $OUT/xcodebuild.log" >&2; exit 1; }
apps=("$DERIVED"/Build/Products/Release-iphonesimulator/*.app)
[[ ${#apps[@]} -eq 1 && -d "${apps[0]}" ]] || { echo "expected one .app in Release-iphonesimulator, found ${#apps[@]}" >&2; exit 1; }
APP="${apps[0]}"
# The JS bundle must be embedded, or the app waits for a dev server that does not exist here.
[[ -f "$APP/main.jsbundle" ]] || { echo "no embedded main.jsbundle in $APP" >&2; exit 1; }
phase_done "xcodebuild Release"

phase "simulator"
# The plain iOS runtime only: variant runtimes (e.g. "-iPhone19-4") reject the stock device types.
runtime="$(xcrun simctl list runtimes available | grep -E '^iOS ' | grep -E 'SimRuntime\.iOS-[0-9-]+$' | tail -n 1 | sed -E 's/.*- (com\.apple\.CoreSimulator\.SimRuntime\.[^ ]+)$/\1/')"
device_type="$(xcrun simctl list devicetypes | grep -E '^iPhone 17 \(' | head -n 1 | sed -E 's/.*\((com\.apple[^)]+)\).*/\1/')"
[[ -n "$runtime" && -n "$device_type" ]] || { echo "no iOS runtime or iPhone 17 device type found" >&2; exit 1; }
UDID="$(xcrun simctl create ci-e2e "$device_type" "$runtime")"
echo "simulator: $UDID"
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "$APP"
phase_done "simulator"

phase "launch"
pid="$(xcrun simctl launch "$UDID" "$BUNDLE_ID" | sed -E 's/.*: ([0-9]+)$/\1/')"
[[ "$pid" =~ ^[0-9]+$ ]] || { echo "launch did not return a pid" >&2; exit 1; }
sleep 20
kill -0 "$pid" 2>/dev/null || { echo "app $BUNDLE_ID (pid $pid) is not running after 20 s" >&2; exit 1; }
xcrun simctl io "$UDID" screenshot "$SHOT"
echo "app running after 20 s (pid $pid)"
echo "screenshot: $SHOT"
phase_done "launch"

# The first screen is the signed-out sign-in screen: its primary button is accent #a78bfa at (60, 1526) and
# its background is #0c0b12 at (603, 2300) on the iPhone 17 screenshot (1206x2622). Vision OCR does not run on
# the VM, so the check reads pixels. A black frame (the failure seen before) reads #000000 and fails here.
phase "first screen"
PIXEL="$OUT/pixel"
cat > "$OUT/pixel.swift" <<'SWIFT'
import Foundation
import ImageIO
import CoreGraphics
let args = CommandLine.arguments
guard args.count == 4, let x = Int(args[2]), let y = Int(args[3]) else { fatalError("usage: pixel <png> <x> <y>") }
guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("cannot read \(args[1])") }
let w = img.width, h = img.height
var px = [UInt8](repeating: 0, count: w * h * 4)
let drawn = px.withUnsafeMutableBytes { buf -> Bool in
    guard let ctx = CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                              space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    return true
}
guard drawn else { fatalError("no bitmap context") }
let i = (y * w + x) * 4
print(String(format: "%02x%02x%02x", px[i], px[i + 1], px[i + 2]))
SWIFT
swiftc -O "$OUT/pixel.swift" -o "$PIXEL"
button="$("$PIXEL" "$SHOT" 60 1526)"
background="$("$PIXEL" "$SHOT" 603 2300)"
[[ "$button" == a78bfa && "$background" == 0c0b12 ]] \
  || { echo "first screen not drawn: button=$button (want a78bfa), background=$background (want 0c0b12)" >&2; exit 1; }
echo "first screen drawn: sign-in button and background match"
phase_done "first screen"
