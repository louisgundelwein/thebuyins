# The Buy-Ins

Home-Poker-Tracker: Gruppen, Live-Buy-ins, Abrechnung mit minimalen Überweisungen. Eine Codebasis für iOS, Android und Web.

- `apps/app`: Expo (Router) App, läuft nativ und im Browser
- `apps/server`: Hono API, Better Auth, Drizzle + Postgres
- `packages/core`: reine Abrechnungslogik (getestet)

## Lokal starten

```sh
pnpm install
pnpm db:up                                  # Postgres in Docker auf :5447
cp apps/server/.env.example apps/server/.env # BETTER_AUTH_SECRET setzen
pnpm db:push
pnpm dev:server                              # API auf :3000
pnpm dev:app                                 # Expo, "w" für Web
```

Am Handy: `EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000` setzen. Magic Links werden lokal im Server-Log ausgegeben.

## Android (Emulator)

```sh
export ANDROID_HOME=~/Android/Sdk JAVA_HOME=<JDK 17>
pnpm --filter @thebuyins/app android        # nativer Build + Installation
adb reverse tcp:3000 tcp:3000              # API im Emulator unter localhost
```

### Ads

Native builds show one Google AdMob interstitial when the host taps Start after the seat draw. If ads may not be requested or none is loaded, the round starts immediately. Expo Go and web skip ads.

- Consent: signed-in users get Google's consent dialog (and Apple's tracking prompt, if the IDFA message is published in AdMob, Privacy & messaging) at app start. Account shows "Ad privacy settings" where Google requires it.
- IDs: the AdMob app and interstitial unit IDs are constants at the top of `apps/app/app.config.js`. `__DEV__` bundles always use Google's test ad units.
- `https://thebuyins.com/app-ads.txt` is served by `apps/server/src/well-known.ts`.

### Ad-free

One-time purchase `com.thebuyins.app.adfree` (non-consumable, same id in App Store Connect and Play Console), bought or restored under Account. Code: `apps/app/src/lib/adfree.native.ts` (expo-iap).

- Ownership is read from the store's existing purchases at app start and when the app returns to the foreground. No server. Once owned, it stays owned for that launch.
- Owners get no ad, no consent dialog and no tracking prompt; the app never initializes the ads SDK or requests an ad.
- If the store cannot be read, ownership is unknown and no ad is shown that launch (a paying user must never see one). The error is logged and shown under Account.
- Web and Expo Go hide the purchase.
