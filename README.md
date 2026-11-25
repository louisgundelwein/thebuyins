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
