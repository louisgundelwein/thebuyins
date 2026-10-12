# Homegame

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
