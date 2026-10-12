#!/usr/bin/env bash
# Local Google Play build: prebuild + signed release AAB at build/android/app-release.aab.
# Bump expo.android.versionCode in app.json before each upload.
# Signing comes from ~/.thebuyins/android-upload.env (keystore + password, kept out of git).
set -euo pipefail
cd "$(dirname "$0")/.."

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
source "${ANDROID_SIGNING_ENV:-$HOME/.thebuyins/android-upload.env}"
CI=1 npx expo prebuild --clean -p android

# AGP's injected signing props override the template's debug signingConfig without editing generated gradle files.
(cd android && ./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file="$ANDROID_KEYSTORE" \
  -Pandroid.injected.signing.store.password="$ANDROID_KEYSTORE_PASSWORD" \
  -Pandroid.injected.signing.key.alias="$ANDROID_KEY_ALIAS" \
  -Pandroid.injected.signing.key.password="$ANDROID_KEYSTORE_PASSWORD")

mkdir -p build/android
cp android/app/build/outputs/bundle/release/app-release.aab build/android/
jarsigner -verify -verbose:summary build/android/app-release.aab | grep -E "verified|CN="
