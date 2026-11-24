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

### Session-start test ads

Set `BUYINS_TEST_ADS=1` during native prebuild, build, and when starting Metro for that build. Rebuild the native app after changing this setting. The final Start button after the seat draw can show one preloaded Google sample ad. If consent is missing or the ad is unavailable, the usual start request proceeds immediately. Expo Go and web skip ads.
