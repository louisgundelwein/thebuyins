#!/usr/bin/env bash
# Check for every branch, no secrets: typecheck and tests from the repo, then a Release build for the iOS simulator.
# Uses no signing identity or secrets, and nothing is installed or run. Runs from the repo root on a fresh MINIONS VM. Output goes to ~/ci-check.
# Any failure exits non-zero.
set -euo pipefail

ROOT="$(pwd)"
APP_DIR="$ROOT/apps/app"
OUT="$HOME/ci-check"
DERIVED="$OUT/derived"

[[ -f "$APP_DIR/app.json" ]] || { echo "run from the repo root: $APP_DIR/app.json not found" >&2; exit 1; }
# shellcheck source=scripts/minions/lib.sh
source "$ROOT/scripts/minions/lib.sh"

phase "toolchain"
check_toolchain
rm -rf "$OUT"
mkdir -p "$OUT"
phase_done "toolchain"

phase "pnpm install"
pnpm install --frozen-lockfile
phase_done "pnpm install"

phase "typecheck"
pnpm -r typecheck
phase_done "typecheck"

phase "tests"
pnpm test
phase_done "tests"

phase "expo prebuild"
(cd "$APP_DIR" && CI=1 npx expo prebuild --clean -p ios --no-install)
phase_done "expo prebuild"

phase "pod install"
(cd "$APP_DIR/ios" && pod install)
phase_done "pod install"

phase "xcodebuild Release"
xcodebuild -workspace "$APP_DIR/ios/TheBuyIns.xcworkspace" -scheme TheBuyIns -configuration Release \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath "$DERIVED" \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES build >"$OUT/xcodebuild.log" 2>&1 \
  || { tail -n 80 "$OUT/xcodebuild.log" >&2; echo "xcodebuild failed, full log: $OUT/xcodebuild.log" >&2; exit 1; }
print_warnings "$OUT/xcodebuild.log"
apps=("$DERIVED"/Build/Products/Release-iphonesimulator/*.app)
[[ ${#apps[@]} -eq 1 && -d "${apps[0]}" ]] || { echo "expected one .app in Release-iphonesimulator, found ${#apps[@]}" >&2; exit 1; }
[[ -f "${apps[0]}/main.jsbundle" ]] || { echo "no embedded main.jsbundle in ${apps[0]}" >&2; exit 1; }
phase_done "xcodebuild Release"
